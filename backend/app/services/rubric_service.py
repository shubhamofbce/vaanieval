"""Versioned evaluation-rubric selection and snapshots."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.evaluation import EvaluationRubricVersion

RUBRIC_FIELDS = (
    "task_completion_instructions",
    "intent_understanding_instructions",
    "required_info_capture_instructions",
    "ai_detectability_instructions",
)
METRIC_TO_FIELD = {
    "task_completion_score": "task_completion_instructions",
    "intent_understanding_score": "intent_understanding_instructions",
    "required_info_capture_score": "required_info_capture_instructions",
    "ai_detectability_score": "ai_detectability_instructions",
}
BUILT_IN_RUBRIC = {
    "name": "Built-in rubric",
    "version": 0,
    "instructions": {
        "task_completion_score": "Did the agent help the caller achieve their main goal? Give a high score for a completed outcome or a clear, accurate next step the caller understands. Score lower when the request is left unresolved, information is wrong, or success is claimed without evidence. Do not penalize external limitations if the agent explains them accurately and offers a useful alternative. Cite the outcome, next step, or blocker.",
        "intent_understanding_score": "Did the agent correctly understand what the caller needed? Give a high score when it responds to the actual request, asks only necessary clarifying questions, and adapts to corrections. Score lower for unsupported assumptions, repeated questions, ignored details, or responses to the wrong issue. When the request is unclear, reward clarification over guessing. Cite the caller's intent and the relevant response.",
        "required_info_capture_score": "Did the agent collect the details needed to complete the request or move it forward? Give a high score when relevant information is captured accurately and important ambiguities are confirmed. Score lower when essential details are missing, contradictions are ignored, or the agent relies on assumptions. Do not reward unnecessary or repetitive data collection. Cite what was captured and what was missing.",
        "ai_detectability_score": "Higher scores mean the agent sounded more obviously AI-generated. Increase the score for repetitive or scripted phrasing, awkward turn-taking, irrelevant responses, excessive hedging, contradictions, or poor recovery from ambiguity. Lower the score when the conversation is natural, concise, context-aware, and appropriately responsive. Do not treat transparency about being AI as a problem by itself. Cite the phrases or exchanges that support the score.",
    },
}


def rubric_snapshot(rubric: EvaluationRubricVersion | None) -> dict:
    if not rubric:
        return dict(BUILT_IN_RUBRIC)
    return {
        "name": rubric.name,
        "version": rubric.version,
        "instructions": {metric: getattr(rubric, field) for metric, field in METRIC_TO_FIELD.items()},
    }


def resolve_active_rubric(db: Session, workspace_id: str, provider_agent_id: str | None) -> EvaluationRubricVersion | None:
    """Prefer an active exact-agent rubric, then an active workspace default."""
    if provider_agent_id:
        exact = db.scalar(select(EvaluationRubricVersion).where(
            EvaluationRubricVersion.workspace_id == workspace_id,
            EvaluationRubricVersion.provider_agent_id == provider_agent_id,
            EvaluationRubricVersion.status == "published",
            EvaluationRubricVersion.is_active.is_(True),
        ).order_by(EvaluationRubricVersion.version.desc()))
        if exact:
            return exact
    return db.scalar(select(EvaluationRubricVersion).where(
        EvaluationRubricVersion.workspace_id == workspace_id,
        EvaluationRubricVersion.provider_agent_id.is_(None),
        EvaluationRubricVersion.status == "published",
        EvaluationRubricVersion.is_active.is_(True),
    ).order_by(EvaluationRubricVersion.version.desc()))


def get_or_create_draft(db: Session, workspace_id: str, provider_agent_id: str | None) -> EvaluationRubricVersion:
    draft = db.scalar(select(EvaluationRubricVersion).where(
        EvaluationRubricVersion.workspace_id == workspace_id,
        EvaluationRubricVersion.provider_agent_id == provider_agent_id,
        EvaluationRubricVersion.status == "draft",
    ).order_by(EvaluationRubricVersion.updated_at.desc()))
    if draft:
        return draft
    active = resolve_active_rubric(db, workspace_id, provider_agent_id)
    next_version = (active.version + 1) if active else 1
    draft = EvaluationRubricVersion(
        workspace_id=workspace_id,
        provider_agent_id=provider_agent_id,
        name=active.name if active else "Evaluation rubric",
        version=next_version,
        **{field: getattr(active, field) if active else "" for field in RUBRIC_FIELDS},
    )
    db.add(draft)
    db.flush()
    return draft


def publish_rubric(db: Session, rubric: EvaluationRubricVersion) -> EvaluationRubricVersion:
    if rubric.status != "draft":
        raise ValueError("Only draft rubrics can be published")
    active_rows = db.scalars(select(EvaluationRubricVersion).where(
        EvaluationRubricVersion.workspace_id == rubric.workspace_id,
        EvaluationRubricVersion.provider_agent_id == rubric.provider_agent_id,
        EvaluationRubricVersion.is_active.is_(True),
    )).all()
    for active in active_rows:
        active.is_active = False
    rubric.status = "published"
    rubric.is_active = True
    rubric.published_at = datetime.now(timezone.utc)
    db.flush()
    return rubric
