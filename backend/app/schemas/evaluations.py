from datetime import datetime

from pydantic import BaseModel, Field


class ConnectEvalProviderRequest(BaseModel):
    provider_name: str = "openai"
    api_key: str
    model_name: str = "gpt-4.1-mini"


class EvalProviderResponse(BaseModel):
    id: str
    provider_name: str
    model_name: str
    api_key_configured: bool = True
    created_at: datetime


class EvalProviderCatalogResponse(BaseModel):
    provider_name: str
    display_name: str
    default_model: str
    models: list[str]


class ProviderModelsResponse(BaseModel):
    """Response showing available models for a provider."""

    provider_name: str
    models: list[str]


class RunEvaluationRequest(BaseModel):
    """Request to run/re-run evaluation on a conversation."""

    provider_name: str = Field(default="openai", description="Eval provider name")
    model_name: str | None = Field(
        default=None, description="Optional model override (e.g., 'gpt-4o'). Uses provider default if omitted."
    )


class ConversationMetricScoreResponse(BaseModel):
    metric_key: str
    score_value: int = Field(ge=0, le=100)
    confidence: float | None = None
    rationale: str | None = None
    evidence_json: str | None = None


class ConversationEvaluationRunResponse(BaseModel):
    id: str
    conversation_id: str
    provider_name: str
    provider_model: str
    status: str
    error_message: str | None
    qa_verdict: str | None = None
    qa_summary: str | None = None
    failure_reason: str | None = None
    recommended_next_step: str | None = None
    supporting_evidence: str | None = None
    created_at: datetime
    updated_at: datetime
    metrics: list[ConversationMetricScoreResponse]
