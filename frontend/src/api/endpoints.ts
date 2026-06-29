import { apiRequest } from './client'
import type {
  AudioAssetResponse,
  AuthResponse,
  DashboardOverviewResponse,
  ConversationEvaluationRunResponse,
  ConversationDetailResponse,
  ConversationInsightResponse,
  ConversationListItem,
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

export function listConversations() {
  return apiRequest<ConversationListItem[]>('/conversations')
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

export function connectEvalProvider(apiKey: string | null, providerName = 'openai', modelName = 'gpt-4.1-mini') {
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
