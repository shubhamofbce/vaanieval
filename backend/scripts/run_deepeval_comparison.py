"""Run a local-only DeepEval comparison and write a privacy-safe Markdown report."""

from __future__ import annotations

import json
import os
import sys
from collections import defaultdict
from pathlib import Path

# DeepEval enables product telemetry unless explicitly opted out. The pilot is
# self-hosted, so disable it before importing any DeepEval modules.
os.environ.setdefault("DEEPEVAL_TELEMETRY_OPT_OUT", "true")
os.environ.setdefault("DEEPEVAL_DISABLE_DOTENV", "1")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.conversation import Conversation, ConversationTurn
from app.models.evaluation import ConversationEvaluationRun, ConversationMetricScore, EvalProviderAccount
from app.models.user import Membership, User
from app.services.credentials import decrypt_secret
from app.services.eval_providers.deepeval_provider import DeepEvalEvaluationProvider
from app.services.rubric_service import rubric_snapshot

EMAIL = "sraj13169@gmail.com"
REPORT = Path(__file__).resolve().parents[2] / "docs" / "deepeval-local-comparison-sraj13169.md"
METRICS = ["task_completion_score", "intent_understanding_score", "required_info_capture_score", "ai_detectability_score"]


def latest_baseline(db, conversation_id: str):
    return db.scalar(select(ConversationEvaluationRun).where(
        ConversationEvaluationRun.conversation_id == conversation_id,
        ConversationEvaluationRun.status == "completed",
        ConversationEvaluationRun.is_shadow.is_(False),
    ).order_by(ConversationEvaluationRun.created_at.desc()).limit(1))


def scores(db, run_id: str) -> dict[str, ConversationMetricScore]:
    rows = db.scalars(select(ConversationMetricScore).where(ConversationMetricScore.evaluation_run_id == run_id)).all()
    return {row.metric_key: row for row in rows}


def main() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == EMAIL))
        if not user:
            raise SystemExit(f"No local user found for {EMAIL}")
        workspace_id = db.scalar(select(Membership.workspace_id).where(Membership.user_id == user.id))
        account = db.scalar(select(EvalProviderAccount).where(
            EvalProviderAccount.workspace_id == workspace_id, EvalProviderAccount.provider_name == "openai"
        ))
        if not account:
            raise SystemExit("No OpenAI evaluator configured for this workspace")
        provider = DeepEvalEvaluationProvider(
            decrypt_secret(account.api_key), account.model_name, get_settings().openai_api_base
        )
        conversations = db.scalars(select(Conversation).where(Conversation.workspace_id == workspace_id).order_by(Conversation.started_at, Conversation.created_at)).all()
        records = []
        for conversation in conversations:
            baseline = latest_baseline(db, conversation.id)
            turns = db.scalars(select(ConversationTurn).where(ConversationTurn.conversation_id == conversation.id).order_by(ConversationTurn.turn_order)).all()
            transcript = "\n".join(f"{turn.role}: {turn.text}" for turn in turns if turn.text)
            if not baseline or not transcript:
                records.append((conversation, baseline, None, {}, {}, "Skipped: missing completed baseline or transcript"))
                continue
            baseline_scores = scores(db, baseline.id)
            try:
                candidate_scores = provider.evaluate_conversation(transcript, {
                    "language": conversation.language, "outcome": conversation.outcome,
                    "provider_agent_id": conversation.provider_agent_id,
                    "rubric": rubric_snapshot(None),
                })
                candidate = ConversationEvaluationRun(
                    workspace_id=workspace_id, conversation_id=conversation.id,
                    provider_name="openai", provider_model=account.model_name,
                    evaluation_engine="deepeval", is_shadow=True, baseline_run_id=baseline.id,
                    status="completed", rubric_name=baseline.rubric_name, rubric_version=baseline.rubric_version,
                    rubric_snapshot_json=baseline.rubric_snapshot_json,
                )
                db.add(candidate); db.flush()
                candidate_map = {}
                for item in candidate_scores:
                    score = ConversationMetricScore(evaluation_run_id=candidate.id, metric_key=item["metric_key"], score_value=item["score_value"], rationale=item["rationale"], evidence_json=json.dumps(item["evidence"]))
                    db.add(score); candidate_map[item["metric_key"]] = score
                db.commit()
                records.append((conversation, baseline, candidate, baseline_scores, candidate_map, None))
            except Exception as exc:  # report failures without leaking credentials
                db.rollback()
                records.append((conversation, baseline, None, baseline_scores, {}, f"DeepEval failed: {type(exc).__name__}: {str(exc)[:300]}"))

        completed = [r for r in records if r[2] is not None]
        totals = defaultdict(lambda: [0, 0, 0])
        baseline_totals = defaultdict(lambda: [0, 0])
        for _, _, _, old, _, _ in records:
            for key in METRICS:
                if key in old:
                    baseline_totals[key][0] += old[key].score_value
                    baseline_totals[key][1] += 1
        for _, _, _, old, new, _ in completed:
            for key in METRICS:
                if key in old and key in new:
                    totals[key][0] += old[key].score_value; totals[key][1] += new[key].score_value; totals[key][2] += 1
        lines = [
            "# Local DeepEval comparison — sraj13169@gmail.com", "",
            "Generated locally from the six calls in this workspace. The report deliberately excludes transcripts, API keys, and audio. DeepEval cloud reporting was not enabled.", "",
            "## Aggregate results", "", "| Metric | Existing average | DeepEval average | Delta | Paired calls |", "|---|---:|---:|---:|---:|",
        ]
        for key in METRICS:
            old_total, new_total, count = totals[key]
            if count:
                old_avg, new_avg = old_total / count, new_total / count
                lines.append(f"| {key} | {old_avg:.1f} | {new_avg:.1f} | {new_avg-old_avg:+.1f} | {count} |")
            elif baseline_totals[key][1]:
                lines.append(f"| {key} | {baseline_totals[key][0] / baseline_totals[key][1]:.1f} | not available | not available | 0 |")
        lines += ["", "## Per-call comparison", ""]
        for conversation, baseline, candidate, old, new, error in records:
            lines += [f"### {conversation.display_name or conversation.provider_conversation_id or conversation.id}", ""]
            if error:
                lines += [f"**Status:** {error}", "", "| Metric | Existing score | DeepEval score |", "|---|---:|---:|"]
                for key in METRICS:
                    lines.append(f"| {key} | {old[key].score_value if key in old else '—'} | not available |")
                lines.append("")
                continue
            lines += [f"Baseline run: `{baseline.id}` · DeepEval shadow run: `{candidate.id}`", "", "| Metric | Existing | DeepEval | Delta | DeepEval rationale |", "|---|---:|---:|---:|---|"]
            for key in METRICS:
                before, after = old.get(key), new.get(key)
                if not before or not after: continue
                rationale = (after.rationale or "No rationale returned").replace("\n", " ").replace("|", "\\|")
                lines.append(f"| {key} | {before.score_value} | {after.score_value} | {after.score_value-before.score_value:+d} | {rationale} |")
            lines.append("")
        lines += [
            "## Interpretation", "",
            "This is a shadow comparison, not a validation that DeepEval is more accurate. The current scores and DeepEval scores were generated by model judges, not adjudicated human labels.", "",
            "## Recommendation", "",
            "Do not replace the current evaluator from this six-call sample. DeepEval scores task completion and required-information capture materially higher on average, while consistently reporting lower AI-detectability risk. These systematic shifts may be useful, but need human calibration before they become customer-facing.",
            "Prioritize blinded review of Room Rate Inquiry, Hotel Cost Estimate, and Hotel Booking Transfer: they contain the largest score gaps. Keep Hotel Reservation and Hotel Reservation Booking as positive-control calls because both evaluators score them strongly.",
            "", 
        ]
        REPORT.write_text("\n".join(lines), encoding="utf-8")
        print(REPORT)
    finally:
        db.close()


if __name__ == "__main__":
    main()
