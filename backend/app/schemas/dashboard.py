from datetime import date

from pydantic import BaseModel


class DashboardMetricSummary(BaseModel):
    metric_key: str
    label: str
    average_score: float | None = None
    average_confidence: float | None = None
    evaluated_conversations: int = 0


class DashboardSummary(BaseModel):
    conversations: int
    successful_conversations: int
    evaluated_conversations: int
    needs_attention_conversations: int
    evaluation_coverage_rate: float | None = None
    success_rate: float | None = None
    average_overall_score: float | None = None
    average_call_duration_seconds: float | None = None
    p95_call_duration_seconds: float | None = None
    weakest_metric_key: str | None = None
    weakest_metric_label: str | None = None


class DashboardComparisonValue(BaseModel):
    current: float | None = None
    previous: float | None = None
    delta: float | None = None


class DashboardComparison(BaseModel):
    conversations: DashboardComparisonValue
    successful_conversations: DashboardComparisonValue
    evaluated_conversations: DashboardComparisonValue
    evaluation_coverage_rate: DashboardComparisonValue
    success_rate: DashboardComparisonValue
    average_overall_score: DashboardComparisonValue
    average_call_duration_seconds: DashboardComparisonValue
    p95_call_duration_seconds: DashboardComparisonValue


class DashboardTrendPoint(BaseModel):
    date: date
    conversations: int
    successful_conversations: int
    evaluated_conversations: int
    success_rate: float | None = None
    evaluation_coverage_rate: float | None = None
    average_overall_score: float | None = None
    average_call_duration_seconds: float | None = None
    p95_call_duration_seconds: float | None = None
    average_task_completion_score: float | None = None
    average_intent_understanding_score: float | None = None
    average_required_info_capture_score: float | None = None
    average_ai_detectability_score: float | None = None


class DashboardOutcomeBucket(BaseModel):
    outcome: str
    count: int


class DashboardAgentSummary(BaseModel):
    agent_id: str | None
    agent_name: str
    conversations: int
    successful_conversations: int
    evaluated_conversations: int
    success_rate: float | None = None
    average_overall_score: float | None = None
    average_call_duration_seconds: float | None = None
    average_task_completion_score: float | None = None


class DashboardOverviewResponse(BaseModel):
    start_date: date
    end_date: date
    previous_start_date: date
    previous_end_date: date
    summary: DashboardSummary
    comparison: DashboardComparison
    metric_summaries: list[DashboardMetricSummary]
    outcome_breakdown: list[DashboardOutcomeBucket]
    trend: list[DashboardTrendPoint]
    agent_breakdown: list[DashboardAgentSummary]
