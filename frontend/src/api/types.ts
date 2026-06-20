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

export type ProviderAgentResponse = {
  id: string
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
  provider_conversation_id: string
  provider_agent_id: string | null
  language: string | null
  outcome: string | null
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
  provider_conversation_id: string
  provider_agent_id: string | null
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
  default_model: string
  models: string[]
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
