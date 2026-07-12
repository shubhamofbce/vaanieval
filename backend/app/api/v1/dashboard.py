from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_workspace_id
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.evaluation import ConversationEvaluationRun, ConversationMetricScore
from app.models.provider import ProviderAccount, ProviderAgent
from app.schemas.dashboard import (
    DashboardAgentSummary,
    DashboardComparison,
    DashboardComparisonValue,
    DashboardMetricSummary,
    DashboardOverviewResponse,
    DashboardOutcomeBucket,
    DashboardSummary,
    DashboardTrendPoint,
)
from app.services.security import utc_now

router = APIRouter()

_METRIC_LABELS: dict[str, str] = {
    'task_completion_score': 'Task completion',
    'intent_understanding_score': 'Intent understanding',
    'required_info_capture_score': 'Required info capture',
    'ai_detectability_score': 'Human-like delivery',
}
_METRIC_ORDER = list(_METRIC_LABELS.keys())
_QA_PASS_OVERALL = 80
_QA_PASS_METRIC_FLOOR = 60


def _coalesce_timestamp(row: Conversation) -> datetime:
    value = row.started_at or row.created_at
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _metric_quality_score(metric_key: str, score_value: float) -> float:
    if metric_key == 'ai_detectability_score':
        if score_value < 60:
            return 100.0
        if score_value <= 70:
            return 70.0
        return float(max(0.0, 100.0 - score_value))
    return score_value


def _is_qa_pass(metric_values: list[float]) -> bool:
    return bool(
        metric_values
        and mean(metric_values) >= _QA_PASS_OVERALL
        and min(metric_values) >= _QA_PASS_METRIC_FLOOR
    )


def _is_error_outcome(outcome: str | None) -> bool:
    if not outcome:
        return False
    normalized = outcome.strip().lower()
    return any(token in normalized for token in ('error', 'fail', 'timeout', 'abort', 'escalat'))


def _safe_average(values: list[float]) -> float | None:
    if not values:
        return None
    return round(mean(values), 2)


def _p95(values: list[float]) -> float | None:
    if not values:
        return None
    sorted_values = sorted(values)
    index = min(len(sorted_values) - 1, max(0, int((len(sorted_values) * 0.95) - 1)))
    return round(sorted_values[index], 2)


def _comparison_value(current: float | None, previous: float | None) -> DashboardComparisonValue:
    delta = None if current is None or previous is None else round(current - previous, 2)
    return DashboardComparisonValue(current=current, previous=previous, delta=delta)


def _resolve_date_range(start_date: date | None, end_date: date | None) -> tuple[date, date, date, date]:
    resolved_end = end_date or utc_now().date()
    resolved_start = start_date or (resolved_end - timedelta(days=29))
    if resolved_start > resolved_end:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='start_date must be before or equal to end_date')

    span_days = (resolved_end - resolved_start).days + 1
    previous_end = resolved_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=span_days - 1)
    return resolved_start, resolved_end, previous_start, previous_end


def _fetch_conversations(
    db: Session,
    *,
    workspace_id: str,
    start_dt: datetime,
    end_dt: datetime,
) -> list[Conversation]:
    timestamp_expr = func.coalesce(Conversation.started_at, Conversation.created_at)
    return db.scalars(
        select(Conversation)
        .where(
            Conversation.workspace_id == workspace_id,
            timestamp_expr >= start_dt,
            timestamp_expr < end_dt,
        )
        .order_by(timestamp_expr.asc())
    ).all()


def _load_latest_completed_runs(
    db: Session,
    *,
    workspace_id: str,
    conversation_ids: list[str],
) -> dict[str, ConversationEvaluationRun]:
    if not conversation_ids:
        return {}

    rows = db.scalars(
        select(ConversationEvaluationRun)
        .where(
            ConversationEvaluationRun.workspace_id == workspace_id,
            ConversationEvaluationRun.conversation_id.in_(conversation_ids),
            ConversationEvaluationRun.status == 'completed',
        )
        .order_by(ConversationEvaluationRun.conversation_id.asc(), ConversationEvaluationRun.created_at.desc())
    ).all()

    latest_by_conversation: dict[str, ConversationEvaluationRun] = {}
    for row in rows:
        latest_by_conversation.setdefault(row.conversation_id, row)
    return latest_by_conversation


def _load_metric_scores(db: Session, *, run_ids: list[str]) -> dict[str, list[ConversationMetricScore]]:
    if not run_ids:
        return {}

    rows = db.scalars(
        select(ConversationMetricScore)
        .where(ConversationMetricScore.evaluation_run_id.in_(run_ids))
        .order_by(ConversationMetricScore.created_at.asc())
    ).all()

    scores_by_run: dict[str, list[ConversationMetricScore]] = defaultdict(list)
    for row in rows:
        scores_by_run[row.evaluation_run_id].append(row)
    return scores_by_run


def _build_records(
    rows: list[Conversation],
    *,
    provider_name_by_account_id: dict[str, str],
    provider_agent_name_by_key: dict[tuple[str, str], str],
    latest_runs_by_conversation: dict[str, ConversationEvaluationRun],
    scores_by_run: dict[str, list[ConversationMetricScore]],
) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for row in rows:
        timestamp = _coalesce_timestamp(row)
        latest_run = latest_runs_by_conversation.get(row.id)
        metrics = scores_by_run.get(latest_run.id, []) if latest_run else []
        metric_map = {metric.metric_key: metric for metric in metrics}
        provider_name = provider_name_by_account_id.get(row.provider_account_id, 'unknown')
        agent_name = provider_agent_name_by_key.get((row.provider_account_id, row.provider_agent_id or ''), 'Unassigned')
        metric_values = [
            _metric_quality_score(metric.metric_key, float(metric.score_value))
            for metric in metrics
        ]

        records.append(
            {
                'id': row.id,
                'timestamp': timestamp,
                'outcome': (row.outcome or 'unknown').strip().lower(),
                # Provider outcome describes call delivery. Dashboard success is the
                # independent VaaniEval QA gate used by the conversation workspace.
                'is_success': _is_qa_pass(metric_values),
                'is_error': _is_error_outcome(row.outcome),
                'provider_name': provider_name,
                'agent_id': row.provider_agent_id,
                'agent_name': agent_name,
                'duration_seconds': (
                    round(max(0.0, (row.ended_at - row.started_at).total_seconds()), 2)
                    if row.started_at and row.ended_at
                    else None
                ),
                'evaluated': bool(metrics),
                'overall_score': _safe_average(metric_values),
                'task_completion_score': float(metric_map['task_completion_score'].score_value) if 'task_completion_score' in metric_map else None,
                'intent_understanding_score': float(metric_map['intent_understanding_score'].score_value) if 'intent_understanding_score' in metric_map else None,
                'required_info_capture_score': float(metric_map['required_info_capture_score'].score_value) if 'required_info_capture_score' in metric_map else None,
                'ai_detectability_score': float(metric_map['ai_detectability_score'].score_value) if 'ai_detectability_score' in metric_map else None,
                'confidence_by_metric': {metric.metric_key: metric.confidence for metric in metrics if metric.confidence is not None},
            }
        )
    return records


def _summarize_records(records: list[dict[str, object]]) -> dict[str, object]:
    conversations = len(records)
    successful_conversations = sum(1 for row in records if row['is_success'])
    evaluated_conversations = sum(1 for row in records if row['evaluated'])
    needs_attention_conversations = sum(1 for row in records if row['evaluated'] and not row['is_success'])
    durations = [row['duration_seconds'] for row in records if row['duration_seconds'] is not None]
    overall_scores = [row['overall_score'] for row in records if row['overall_score'] is not None]

    metric_summaries: list[DashboardMetricSummary] = []
    for metric_key in _METRIC_ORDER:
        # Human-like delivery (ai_detectability_score) is a risk score where lower is
        # better. Convert it to the same "higher is better" quality scale as every
        # other metric so averages, trend colors, and the weakest-metric ranking stay
        # consistent instead of misreporting a good score as the worst metric.
        metric_values = [
            _metric_quality_score(metric_key, float(row[metric_key]))
            for row in records
            if row.get(metric_key) is not None
        ]
        confidence_values = [
            float(row['confidence_by_metric'][metric_key])
            for row in records
            if row.get(metric_key) is not None and metric_key in row['confidence_by_metric']
        ]

        metric_summaries.append(
            DashboardMetricSummary(
                metric_key=metric_key,
                label=_METRIC_LABELS[metric_key],
                average_score=_safe_average(metric_values),
                average_confidence=_safe_average(confidence_values),
                evaluated_conversations=len(metric_values),
            )
        )

    weakest_metric = min(
        (metric for metric in metric_summaries if metric.average_score is not None),
        key=lambda metric: metric.average_score or 0,
        default=None,
    )

    return {
        'conversations': conversations,
        'successful_conversations': successful_conversations,
        'evaluated_conversations': evaluated_conversations,
        'needs_attention_conversations': needs_attention_conversations,
        'evaluation_coverage_rate': round(evaluated_conversations / conversations, 4) if conversations else None,
        'success_rate': round(successful_conversations / conversations, 4) if conversations else None,
        'average_overall_score': _safe_average([float(value) for value in overall_scores]),
        'average_call_duration_seconds': _safe_average([float(value) for value in durations]),
        'p95_call_duration_seconds': _p95([float(value) for value in durations]),
        'weakest_metric_key': weakest_metric.metric_key if weakest_metric else None,
        'weakest_metric_label': weakest_metric.label if weakest_metric else None,
        'metric_summaries': metric_summaries,
    }


def _build_time_series(records: list[dict[str, object]], *, start_date: date, end_date: date) -> list[DashboardTrendPoint]:
    grouped: dict[date, list[dict[str, object]]] = defaultdict(list)
    for row in records:
        grouped[row['timestamp'].date()].append(row)

    points: list[DashboardTrendPoint] = []
    current_date = start_date
    while current_date <= end_date:
        day_rows = grouped.get(current_date, [])
        conversations = len(day_rows)
        successful_conversations = sum(1 for row in day_rows if row['is_success'])
        evaluated_conversations = sum(1 for row in day_rows if row['evaluated'])
        durations = [row['duration_seconds'] for row in day_rows if row['duration_seconds'] is not None]
        overall_scores = [row['overall_score'] for row in day_rows if row['overall_score'] is not None]

        points.append(
            DashboardTrendPoint(
                date=current_date,
                conversations=conversations,
                successful_conversations=successful_conversations,
                evaluated_conversations=evaluated_conversations,
                success_rate=round(successful_conversations / conversations, 4) if conversations else None,
                evaluation_coverage_rate=round(evaluated_conversations / conversations, 4) if conversations else None,
                average_overall_score=_safe_average([float(value) for value in overall_scores]),
                average_call_duration_seconds=_safe_average([float(value) for value in durations]),
                p95_call_duration_seconds=_p95([float(value) for value in durations]),
                average_task_completion_score=_safe_average([float(row['task_completion_score']) for row in day_rows if row['task_completion_score'] is not None]),
                average_intent_understanding_score=_safe_average([float(row['intent_understanding_score']) for row in day_rows if row['intent_understanding_score'] is not None]),
                average_required_info_capture_score=_safe_average([float(row['required_info_capture_score']) for row in day_rows if row['required_info_capture_score'] is not None]),
                average_ai_detectability_score=_safe_average([float(row['ai_detectability_score']) for row in day_rows if row['ai_detectability_score'] is not None]),
            )
        )
        current_date += timedelta(days=1)

    return points


def _build_outcome_breakdown(records: list[dict[str, object]]) -> list[DashboardOutcomeBucket]:
    counts = Counter(row['outcome'] for row in records)
    return [DashboardOutcomeBucket(outcome=outcome, count=count) for outcome, count in counts.most_common()]


def _build_agent_breakdown(records: list[dict[str, object]]) -> list[DashboardAgentSummary]:
    grouped: dict[tuple[str | None, str], list[dict[str, object]]] = defaultdict(list)
    for row in records:
        grouped[(row['agent_id'], str(row['agent_name']))].append(row)

    summaries = [
        DashboardAgentSummary(
            agent_id=agent_id,
            agent_name=agent_name,
            conversations=len(rows),
            successful_conversations=sum(1 for row in rows if row['is_success']),
            evaluated_conversations=sum(1 for row in rows if row['evaluated']),
            success_rate=round(sum(1 for row in rows if row['is_success']) / len(rows), 4) if rows else None,
            average_overall_score=_safe_average([float(row['overall_score']) for row in rows if row['overall_score'] is not None]),
            average_call_duration_seconds=_safe_average([float(row['duration_seconds']) for row in rows if row['duration_seconds'] is not None]),
            average_task_completion_score=_safe_average([float(row['task_completion_score']) for row in rows if row['task_completion_score'] is not None]),
        )
        for (agent_id, agent_name), rows in grouped.items()
    ]

    summaries.sort(key=lambda row: (row.conversations, row.success_rate or 0), reverse=True)
    return summaries[:8]


@router.get('', response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    workspace_id: str = Depends(get_current_workspace_id),
    db: Session = Depends(get_db),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
) -> DashboardOverviewResponse:
    current_start_date, current_end_date, previous_start_date, previous_end_date = _resolve_date_range(start_date, end_date)

    current_start_dt = datetime.combine(current_start_date, time.min, tzinfo=timezone.utc)
    current_end_dt = datetime.combine(current_end_date + timedelta(days=1), time.min, tzinfo=timezone.utc)
    previous_start_dt = datetime.combine(previous_start_date, time.min, tzinfo=timezone.utc)
    previous_end_dt = datetime.combine(previous_end_date + timedelta(days=1), time.min, tzinfo=timezone.utc)

    current_rows = _fetch_conversations(db, workspace_id=workspace_id, start_dt=current_start_dt, end_dt=current_end_dt)
    previous_rows = _fetch_conversations(db, workspace_id=workspace_id, start_dt=previous_start_dt, end_dt=previous_end_dt)

    account_ids = {row.provider_account_id for row in current_rows + previous_rows}
    accounts = db.scalars(select(ProviderAccount).where(ProviderAccount.id.in_(account_ids))).all() if account_ids else []
    provider_name_by_account_id = {row.id: row.provider_name for row in accounts}

    agents = db.scalars(select(ProviderAgent).where(ProviderAgent.provider_account_id.in_(account_ids))).all() if account_ids else []
    provider_agent_name_by_key = {(row.provider_account_id, row.provider_agent_id): row.name for row in agents}

    current_run_map = _load_latest_completed_runs(db, workspace_id=workspace_id, conversation_ids=[row.id for row in current_rows])
    previous_run_map = _load_latest_completed_runs(db, workspace_id=workspace_id, conversation_ids=[row.id for row in previous_rows])

    current_scores = _load_metric_scores(db, run_ids=[row.id for row in current_run_map.values()])
    previous_scores = _load_metric_scores(db, run_ids=[row.id for row in previous_run_map.values()])

    current_records = _build_records(
        current_rows,
        provider_name_by_account_id=provider_name_by_account_id,
        provider_agent_name_by_key=provider_agent_name_by_key,
        latest_runs_by_conversation=current_run_map,
        scores_by_run=current_scores,
    )
    previous_records = _build_records(
        previous_rows,
        provider_name_by_account_id=provider_name_by_account_id,
        provider_agent_name_by_key=provider_agent_name_by_key,
        latest_runs_by_conversation=previous_run_map,
        scores_by_run=previous_scores,
    )

    current_summary = _summarize_records(current_records)
    previous_summary = _summarize_records(previous_records)

    comparison = DashboardComparison(
        conversations=_comparison_value(current_summary['conversations'], previous_summary['conversations']),
        successful_conversations=_comparison_value(current_summary['successful_conversations'], previous_summary['successful_conversations']),
        evaluated_conversations=_comparison_value(current_summary['evaluated_conversations'], previous_summary['evaluated_conversations']),
        evaluation_coverage_rate=_comparison_value(current_summary['evaluation_coverage_rate'], previous_summary['evaluation_coverage_rate']),
        success_rate=_comparison_value(current_summary['success_rate'], previous_summary['success_rate']),
        average_overall_score=_comparison_value(current_summary['average_overall_score'], previous_summary['average_overall_score']),
        average_call_duration_seconds=_comparison_value(current_summary['average_call_duration_seconds'], previous_summary['average_call_duration_seconds']),
        p95_call_duration_seconds=_comparison_value(current_summary['p95_call_duration_seconds'], previous_summary['p95_call_duration_seconds']),
    )

    return DashboardOverviewResponse(
        start_date=current_start_date,
        end_date=current_end_date,
        previous_start_date=previous_start_date,
        previous_end_date=previous_end_date,
        summary=DashboardSummary(
            conversations=current_summary['conversations'],
            successful_conversations=current_summary['successful_conversations'],
            evaluated_conversations=current_summary['evaluated_conversations'],
            needs_attention_conversations=current_summary['needs_attention_conversations'],
            evaluation_coverage_rate=current_summary['evaluation_coverage_rate'],
            success_rate=current_summary['success_rate'],
            average_overall_score=current_summary['average_overall_score'],
            average_call_duration_seconds=current_summary['average_call_duration_seconds'],
            p95_call_duration_seconds=current_summary['p95_call_duration_seconds'],
            weakest_metric_key=current_summary['weakest_metric_key'],
            weakest_metric_label=current_summary['weakest_metric_label'],
        ),
        comparison=comparison,
        metric_summaries=current_summary['metric_summaries'],
        outcome_breakdown=_build_outcome_breakdown(current_records),
        trend=_build_time_series(current_records, start_date=current_start_date, end_date=current_end_date),
        agent_breakdown=_build_agent_breakdown(current_records),
    )
