export type AuthResponse = {
  user_id: string
  email: string
  workspace_id: string
}

export type MessageResponse = {
  message: string
}

export type ProviderConnectionResponse = {
  id: string
  provider_name: string
}

export type ProviderConnectionListItem = {
  id: string
  provider_name: string
  created_at: string
}

export type ProviderAgentResponse = {
  id: string
  provider_account_id: string
  provider_name: string
  provider_agent_id: string
  name: string
  is_default: boolean
}

export type ImportJobResponse = {
  id: string
  status: string
  imported_count: number
  failed_count: number
  cursor: string | null
  created_at: string
}

export type ImportProgressResponse = {
  import_job_id: string
  status: string
  imported_count: number
  failed_count: number
  queue_pending: number
  queue_leased: number
}

export type ConversationListItem = {
  id: string
  provider_account_id: string
  provider_name: string
  provider_conversation_id: string
  provider_agent_id: string | null
  provider_agent_name: string | null
  language: string | null
  outcome: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export type ConversationTurnItem = {
  id: string
  role: string
  text: string
  started_ms: number | null
  ended_ms: number | null
  turn_order: number
}

export type ConversationDetailResponse = {
  id: string
  provider_name: string
  provider_conversation_id: string
  provider_agent_id: string | null
  provider_agent_name: string | null
  language: string | null
  outcome: string | null
  turns: ConversationTurnItem[]
}

export type ConversationQualitySignal = {
  label: string
  value: string
}

export type ConversationInsightResponse = {
  conversation_id: string
  assistant_name: string | null
  call_status: string | null
  call_result: string | null
  summary_title: string | null
  summary_text: string | null
  duration_seconds: number | null
  started_at_unix: number | null
  end_reason: string | null
  environment: string | null
  warnings: string[]
  quality_signals: ConversationQualitySignal[]
}

export type AudioAssetResponse = {
  conversation_id: string
  source_url: string | null
  local_path: string | null
  duration_ms: number | null
  mime_type: string | null
}

export type EvalProviderResponse = {
  id: string
  provider_name: string
  model_name: string
  api_key_configured: boolean
  created_at: string
}

export type EvalProviderCatalogResponse = {
  provider_name: string
  display_name: string
  default_model: string | null
  models: string[]
  requires_api_key: boolean
}

export type ProviderModelsResponse = {
  provider_name: string
  models: string[]
}

export type ConversationMetricScoreResponse = {
  metric_key: string
  score_value: number
  confidence: number | null
  rationale: string | null
  evidence_json: string | null
}

export type ConversationEvaluationRunResponse = {
  id: string
  conversation_id: string
  provider_name: string
  provider_model: string
  status: string
  error_message: string | null
  created_at: string
  updated_at: string
  metrics: ConversationMetricScoreResponse[]
}

export type DashboardMetricSummary = {
  metric_key: string
  label: string
  average_score: number | null
  average_confidence: number | null
  evaluated_conversations: number
}

export type DashboardSummary = {
  conversations: number
  successful_conversations: number
  evaluated_conversations: number
  evaluation_coverage_rate: number | null
  success_rate: number | null
  average_overall_score: number | null
  average_call_duration_seconds: number | null
  p95_call_duration_seconds: number | null
}

export type DashboardComparisonValue = {
  current: number | null
  previous: number | null
  delta: number | null
}

export type DashboardComparison = {
  conversations: DashboardComparisonValue
  successful_conversations: DashboardComparisonValue
  evaluated_conversations: DashboardComparisonValue
  evaluation_coverage_rate: DashboardComparisonValue
  success_rate: DashboardComparisonValue
  average_overall_score: DashboardComparisonValue
  average_call_duration_seconds: DashboardComparisonValue
  p95_call_duration_seconds: DashboardComparisonValue
}

export type DashboardTrendPoint = {
  date: string
  conversations: number
  successful_conversations: number
  evaluated_conversations: number
  success_rate: number | null
  evaluation_coverage_rate: number | null
  average_overall_score: number | null
  average_call_duration_seconds: number | null
  p95_call_duration_seconds: number | null
  average_task_completion_score: number | null
  average_intent_understanding_score: number | null
  average_required_info_capture_score: number | null
  average_ai_detectability_score: number | null
}

export type DashboardOutcomeBucket = {
  outcome: string
  count: number
}

export type DashboardAgentSummary = {
  agent_id: string | null
  agent_name: string
  conversations: number
  successful_conversations: number
  evaluated_conversations: number
  success_rate: number | null
  average_overall_score: number | null
  average_call_duration_seconds: number | null
  average_task_completion_score: number | null
}

export type DashboardOverviewResponse = {
  start_date: string
  end_date: string
  previous_start_date: string
  previous_end_date: string
  summary: DashboardSummary
  comparison: DashboardComparison
  metric_summaries: DashboardMetricSummary[]
  outcome_breakdown: DashboardOutcomeBucket[]
  trend: DashboardTrendPoint[]
  agent_breakdown: DashboardAgentSummary[]
}
