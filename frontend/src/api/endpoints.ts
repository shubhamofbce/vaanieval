import { apiRequest } from './client'
import type {
  AudioAssetResponse,
  AuthResponse,
  DashboardOverviewResponse,
  ConversationEvaluationRunResponse,
  ConversationDetailResponse,
  ConversationInsightResponse,
  ConversationListItem,
  ConversationListResponse,
  EvalProviderCatalogResponse,
  EvalProviderResponse,
  ImportJobResponse,
  ImportProgressResponse,
  MessageResponse,
  ProviderAgentResponse,
  ProviderConnectionListItem,
  ProviderConnectionResponse,
  ProviderModelsResponse,
} from './types'

export function requestMagicLink(email: string) {
  return apiRequest<MessageResponse>('/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function verifyMagicLink(token: string) {
  return apiRequest<AuthResponse>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function getMe() {
  return apiRequest<AuthResponse>('/auth/me')
}

export function logout() {
  return apiRequest<MessageResponse>('/auth/logout', { method: 'POST' })
}

export function connectProvider(apiKey: string, providerName = 'elevenlabs') {
  return apiRequest<ProviderConnectionResponse>('/provider/connect', {
    method: 'POST',
    body: JSON.stringify({ api_key: apiKey, provider_name: providerName }),
  })
}

export function testProviderConnection(providerAccountId?: string) {
  const query = providerAccountId
    ? `?provider_account_id=${encodeURIComponent(providerAccountId)}`
    : ''
  return apiRequest<{ ok: boolean; agent_count?: number; error?: string }>(`/provider/test${query}`, {
    method: 'POST',
  })
}

export function listProviderConnections() {
  return apiRequest<ProviderConnectionListItem[]>('/provider/connections')
}

export function listAgents(options?: {
  providerAccountId?: string
  providerName?: string
  search?: string
  refresh?: boolean
}) {
  const params = new URLSearchParams()
  if (options?.providerAccountId) {
    params.append('provider_account_id', options.providerAccountId)
  }
  if (options?.providerName) {
    params.append('provider_name', options.providerName)
  }
  if (options?.search) {
    params.append('search', options.search)
  }
  params.append('refresh', String(options?.refresh ?? false))
  return apiRequest<ProviderAgentResponse[]>(`/provider/agents?${params.toString()}`)
}

export function setDefaultAgent(agentId: string) {
  return apiRequest<ProviderAgentResponse>(`/provider/agents/${agentId}/default`, {
    method: 'POST',
  })
}

export function createImport(payload: {
  provider_account_id: string
  agent_id?: string
  start_date?: string
  end_date?: string
  page_size?: number
}) {
  return apiRequest<ImportJobResponse>('/imports', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getImportJob(importJobId: string) {
  return apiRequest<ImportJobResponse>(`/imports/${importJobId}`)
}

export function getImportProgress(importJobId: string) {
  return apiRequest<ImportProgressResponse>(`/imports/${importJobId}/progress`)
}

export function cancelImport(importJobId: string) {
  return apiRequest<ImportJobResponse>(`/imports/${importJobId}/cancel`, {
    method: 'POST',
  })
}

export function listConversations(options?: {
  agent_id?: string
  language?: string
  provider_name?: string
  search?: string
  score_band?: string
  qa_status?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}) {
  const params = new URLSearchParams()
  if (options?.agent_id) params.append('agent_id', options.agent_id)
  if (options?.language) params.append('language', options.language)
  if (options?.provider_name) params.append('provider_name', options.provider_name)
  if (options?.search) params.append('search', options.search)
  if (options?.score_band) params.append('score_band', options.score_band)
  if (options?.qa_status) params.append('qa_status', options.qa_status)
  if (options?.date_from) params.append('date_from', options.date_from)
  if (options?.date_to) params.append('date_to', options.date_to)
  if (options?.limit != null) params.append('limit', String(options.limit))
  if (options?.offset != null) params.append('offset', String(options.offset))
  
  const query = params.toString()
  return apiRequest<ConversationListResponse>(`/conversations${query ? `?${query}` : ''}`)
}

export function getConversation(conversationId: string) {
  return apiRequest<ConversationDetailResponse>(`/conversations/${conversationId}`)
}

export function getConversationInsights(conversationId: string, refreshAnalysis = false) {
  return apiRequest<ConversationInsightResponse>(
    `/conversations/${conversationId}/insights?refresh_analysis=${refreshAnalysis}`,
  )
}

export function getAudioMetadata(conversationId: string) {
  return apiRequest<AudioAssetResponse>(`/media/conversations/${conversationId}/audio`)
}

export function connectEvalProvider(apiKey: string, providerName = 'openai', modelName = 'gpt-4.1-mini') {
  return apiRequest<EvalProviderResponse>('/evaluations/providers/connect', {
    method: 'POST',
    body: JSON.stringify({ api_key: apiKey, provider_name: providerName, model_name: modelName }),
  })
}

export function listEvalProviders() {
  return apiRequest<EvalProviderResponse[]>('/evaluations/providers')
}

export function getEvalProviderCatalog() {
  return apiRequest<EvalProviderCatalogResponse[]>('/evaluations/providers/catalog')
}

export function getEvalProviderModels(providerName: string) {
  return apiRequest<ProviderModelsResponse>(
    `/evaluations/providers/${encodeURIComponent(providerName)}/models`,
  )
}

export function runConversationEvaluation(
  conversationId: string,
  providerName = 'openai',
  modelName?: string,
) {
  const params = new URLSearchParams()
  params.append('provider_name', providerName)
  if (modelName) {
    params.append('model_name', modelName)
  }
  return apiRequest<ConversationEvaluationRunResponse>(
    `/evaluations/conversations/${conversationId}/run?${params.toString()}`,
    { method: 'POST' },
  )
}

export function getLatestConversationEvaluation(conversationId: string) {
  return apiRequest<ConversationEvaluationRunResponse>(`/evaluations/conversations/${conversationId}/latest`)
}

export function getDashboardOverview(options?: { startDate?: string; endDate?: string }) {
  const params = new URLSearchParams()
  if (options?.startDate) {
    params.append('start_date', options.startDate)
  }
  if (options?.endDate) {
    params.append('end_date', options.endDate)
  }
  const query = params.toString()
  return apiRequest<DashboardOverviewResponse>(`/dashboard${query ? `?${query}` : ''}`)
}
