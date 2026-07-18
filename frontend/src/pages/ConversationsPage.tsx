import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { API_BASE } from '../api/client'
import {
  getAudioMetadata,
  getAudioWaveform,
  getConversation,
  getConversationInsights,
  getLatestConversationEvaluation,
  listEvalProviders,
  listConversations,
  runConversationEvaluation,
  listAgents,
  listProviderConnections,
} from '../api/endpoints'
import { Skeleton } from '../components/Skeleton'
import {
  buildQaSummary,
  getMetricDisplayLabel,
  getMetricDisplayScore,
  getMetricScoreTone,
  getScoreTone,
  parseEvidence,
  QA_VERDICT_LABELS,
} from '../lib/qa'
import { formatDateTime, humanizeDiagnosticText, humanizeOutcome } from '../lib/format'
import type {
  AudioAssetResponse,
  AudioWaveformResponse,
  ConversationEvaluationRunResponse,
  ConversationDetailResponse,
  ConversationInsightResponse,
  ConversationListItem,
  ConversationListResponse,
} from '../api/types'

function formatProviderName(providerName: string) {
  return providerName === 'elevenlabs'
    ? 'ElevenLabs'
    : providerName === 'vapi'
      ? 'Vapi'
      : providerName === 'bolna'
        ? 'Bolna'
        : providerName
}

function looksLikeOpaqueId(value: string | null | undefined) {
  if (!value) {
    return false
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(trimmed)
}

function pickAgentDisplayName(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    if (!candidate || !candidate.trim()) {
      continue
    }
    if (!looksLikeOpaqueId(candidate)) {
      return candidate
    }
  }
  return 'Voice assistant'
}

const SPEED_OPTIONS = [1, 1.2, 1.5, 2]
const SUBTITLE_SYNC_LEAD_SECONDS = 0.2
const CONVERSATIONS_PAGE_SIZE = 10
const METRIC_LABELS: Record<string, string> = {
  task_completion_score: 'Task Completion',
  intent_understanding_score: 'Intent Understanding',
  required_info_capture_score: 'Required Info Capture',
  ai_detectability_score: 'AI Detectability',
}

type DetailTab = 'score' | 'player' | 'transcript' | 'metadata'
type QaInboxFilter = 'attention' | 'passed' | 'all'

function formatConversationTitle(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return 'Conversation'
  }
  return `Conversation on ${formatDateTime(date)}`
}

function getConversationDisplayName(row: ConversationListItem) {
  return row.display_name || row.provider_agent_name || formatConversationTitle(getConversationDisplayDate(row))
}

function getConversationDisplayDate(row: ConversationListItem) {
  return row.started_at || row.created_at
}

function formatConversationDate(value: string | null) {
  if (!value) {
    return 'Unknown'
  }
  return formatDateTime(value)
}

function normalizeTimelineOffsets<T extends { started_ms: number | null; ended_ms: number | null }>(
  turns: T[],
) {
  const starts = turns
    .map((turn) => turn.started_ms)
    .filter((value): value is number => Number.isFinite(value as number))

  if (starts.length === 0) {
    return { offsetMs: 0 }
  }

  const minStart = Math.min(...starts)
  const maxStart = Math.max(...starts)
  const looksAbsolute = minStart >= 1_000_000_000_000 || maxStart >= 1_000_000_000_000
  const unrealisticallyLargeRange = maxStart > 86_400_000

  if (looksAbsolute || unrealisticallyLargeRange) {
    return { offsetMs: minStart }
  }

  return { offsetMs: 0 }
}

function normalizeConversationListItems(value: unknown): ConversationListItem[] {
  return Array.isArray(value) ? value : []
}

function normalizeConversationListResponse(value: unknown): { items: ConversationListItem[]; total: number } {
  if (!value || typeof value !== 'object') {
    return { items: [], total: 0 }
  }

  const response = value as Partial<ConversationListResponse> & { items?: unknown }
  const items = normalizeConversationListItems(response.items)
  const total = typeof response.total === 'number' && Number.isFinite(response.total) ? response.total : items.length
  return { items, total }
}

export function ConversationsPage() {
  const [searchParams] = useSearchParams()
  const preselectedAgentId = searchParams.get('agentId') ?? ''
  const preselectedAgentName = searchParams.get('agentName') ?? ''
  const [rows, setRows] = useState<ConversationListItem[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [qaInboxFilter, setQaInboxFilter] = useState<QaInboxFilter>('attention')
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<ConversationDetailResponse | null>(null)
  const [audio, setAudio] = useState<AudioAssetResponse | null>(null)
  const [waveform, setWaveform] = useState<AudioWaveformResponse | null>(null)
  const [insights, setInsights] = useState<ConversationInsightResponse | null>(null)
  const [insightsError, setInsightsError] = useState('')
  const [evaluationRun, setEvaluationRun] = useState<ConversationEvaluationRunResponse | null>(null)
  const [listEvaluationLoading, setListEvaluationLoading] = useState<Record<string, boolean>>({})
  const [evaluationProviders, setEvaluationProviders] = useState<Array<{ provider_name: string; model_name: string }>>([])

  const mergeEvaluationForDisplay = (
    previous: ConversationEvaluationRunResponse | null,
    incoming: ConversationEvaluationRunResponse | null,
  ) => {
    if (!incoming) {
      return previous
    }

    if (incoming.metrics.length > 0) {
      return incoming
    }

    if (!previous || previous.metrics.length === 0) {
      return incoming
    }

    return {
      ...incoming,
      metrics: previous.metrics,
      qa_verdict: incoming.qa_verdict ?? previous.qa_verdict,
      qa_summary: incoming.qa_summary ?? previous.qa_summary,
      failure_reason: incoming.failure_reason ?? previous.failure_reason,
      recommended_next_step: incoming.recommended_next_step ?? previous.recommended_next_step,
      supporting_evidence: incoming.supporting_evidence ?? previous.supporting_evidence,
    }
  }
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [detailTab, setDetailTab] = useState<DetailTab>('score')
  const [currentPage, setCurrentPage] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const subtitleListRef = useRef<HTMLUListElement | null>(null)
  const lastActiveTurnRef = useRef(-1)

  // Debounce the search query to avoid excessive API calls.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query)
      setCurrentPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const options: Record<string, string | number> = {}
        if (preselectedAgentId) options.agent_id = preselectedAgentId
        else if (agentFilter !== 'all') options.agent_id = agentFilter
        
        if (languageFilter !== 'all') options.language = languageFilter
        if (providerFilter !== 'all') options.provider_name = providerFilter
        if (debouncedQuery) options.search = debouncedQuery
        if (scoreFilter !== 'all') options.score_band = scoreFilter
        if (qaInboxFilter !== 'all') options.qa_status = qaInboxFilter
        if (dateFrom) options.date_from = `${dateFrom}T00:00:00.000Z`
        if (dateTo) options.date_to = `${dateTo}T23:59:59.999Z`
        options.limit = CONVERSATIONS_PAGE_SIZE
        options.offset = (currentPage - 1) * CONVERSATIONS_PAGE_SIZE

        const data = await listConversations(options as any)
        if (!cancelled) {
          const { items, total: nextTotal } = normalizeConversationListResponse(data)
          setRows(items)
          setTotal(nextTotal)
          setSelectedId((current) => items.some((d) => d.id === current) ? current : (items[0]?.id || ''))
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load conversations')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [preselectedAgentId, agentFilter, languageFilter, providerFilter, debouncedQuery, scoreFilter, qaInboxFilter, dateFrom, dateTo, currentPage])

  useEffect(() => {
    let cancelled = false

    const loadProviders = async () => {
      const providers = await listEvalProviders().catch(() => [])
      if (!cancelled) {
        setEvaluationProviders(providers.map((provider) => ({
          provider_name: provider.provider_name,
          model_name: provider.model_name,
        })))
      }
    }

    void loadProviders()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedId || !evaluationRun || !['queued', 'running'].includes(evaluationRun.status)) {
      return
    }

    let cancelled = false
    const intervalId = window.setInterval(() => {
      void getLatestConversationEvaluation(selectedId)
        .then((latest) => {
          if (cancelled) {
            return
          }

          setEvaluationRun((current) => mergeEvaluationForDisplay(current, latest))
        })
        .catch(() => undefined)
    }, 2500)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [selectedId, evaluationRun])

  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const [availableAgents, setAvailableAgents] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      listProviderConnections().catch(() => []),
      listAgents().catch(() => [])
    ]).then(([providers, agents]) => {
      if (cancelled) return
      setAvailableProviders(providers.map(p => p.provider_name))
      setAvailableAgents(agents.map(a => ({ id: a.provider_agent_id, name: a.name || a.provider_agent_id })))
    })
    return () => { cancelled = true }
  }, [])

  const providerOptions = useMemo(() => {
    const safeRows = normalizeConversationListItems(rows)
    const set = new Set(availableProviders)
    safeRows.forEach((row) => set.add(row.provider_name))
    return Array.from(set).sort((left, right) =>
      formatProviderName(left).localeCompare(formatProviderName(right)),
    )
  }, [availableProviders, rows])

  const agentOptions = useMemo(() => {
    const safeRows = normalizeConversationListItems(rows)
    const map = new Map(availableAgents.map((a) => [a.id, a.name]))
    safeRows.forEach((row) => {
      if (row.provider_agent_id && !map.has(row.provider_agent_id)) {
        map.set(row.provider_agent_id, row.provider_agent_name || row.provider_agent_id)
      }
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [availableAgents, rows])

  const activeFilterCount = [
    providerFilter !== 'all', 
    !preselectedAgentId && agentFilter !== 'all', 
    scoreFilter !== 'all',
    languageFilter !== 'all',
    dateFrom !== '',
    dateTo !== ''
  ].filter(Boolean).length

  const clearFilters = () => {
    setProviderFilter('all')
    setAgentFilter('all')
    setScoreFilter('all')
    setLanguageFilter('all')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
  }

  const selectedRow = selectedId ? rows.find((row) => row.id === selectedId) ?? null : null

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setAudio(null)
      setWaveform(null)
      setInsights(null)
      setInsightsError('')
      setEvaluationRun(null)
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(false)
      return
    }

    let cancelled = false

    const loadDetail = async () => {
      setDetailLoading(true)
      try {
        setInsightsLoading(true)
        setInsightsError('')
        const [conversationData, audioData] = await Promise.all([
          getConversation(selectedId),
          getAudioMetadata(selectedId).catch(() => null),
        ])
        const insightsData = await getConversationInsights(selectedId).catch((err: unknown) => {
          if (!cancelled) {
            setInsightsError(err instanceof Error ? err.message : 'Failed to load provider insights')
          }
          return null
        })
        const latestEvaluation = await getLatestConversationEvaluation(selectedId).catch(() => null)
        if (!cancelled) {
          setDetail(conversationData)
          setAudio(audioData)
          setWaveform(null)
          setInsights(insightsData)
          setEvaluationRun(latestEvaluation)
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null)
          setAudio(null)
          setWaveform(null)
          setInsights(null)
          setInsightsError('')
          setEvaluationRun(null)
          setError(err instanceof Error ? err.message : 'Failed to load selected conversation')
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false)
          setInsightsLoading(false)
        }
      }
    }

    void loadDetail()

    return () => {
      cancelled = true
    }
  }, [selectedId])

  useEffect(() => {
    if (!selectedId || !audio?.source_url) {
      return
    }

    let cancelled = false
    let timerId: number | undefined
    const loadWaveform = async () => {
      const result = await getAudioWaveform(selectedId).catch(() => null)
      if (cancelled || !result) {
        return
      }
      setWaveform(result)
      if (result.status === 'pending') {
        timerId = window.setTimeout(() => void loadWaveform(), 2500)
      }
    }

    void loadWaveform()
    return () => {
      cancelled = true
      if (timerId) {
        window.clearTimeout(timerId)
      }
    }
  }, [audio?.source_url, selectedId])

  const streamUrl = useMemo(() => {
    if (!selectedId) {
      return ''
    }
    return `${API_BASE}/media/conversations/${selectedId}/audio/stream`
  }, [selectedId])

  const turnsForPlayback = useMemo(() => {
    if (!detail) {
      return []
    }

    const sorted = [...detail.turns]
      .filter((turn) => {
        const role = (turn.role || '').toLowerCase()
        return role !== 'system' && role !== 'developer'
      })
      .sort((a, b) => a.turn_order - b.turn_order)

    const { offsetMs } = normalizeTimelineOffsets(sorted)

    return sorted.map((turn, index) => {
      const previousStart = sorted[index - 1]?.started_ms
      const fallbackStartMs = index === 0 ? 0 : (previousStart != null ? Math.max(0, previousStart - offsetMs) : 0)
      const normalizedStartMs = turn.started_ms != null ? Math.max(0, turn.started_ms - offsetMs) : fallbackStartMs
      const startSec = normalizedStartMs / 1000
      const normalizedEndMs = turn.ended_ms != null ? Math.max(0, turn.ended_ms - offsetMs) : null
      let endSec = normalizedEndMs != null ? normalizedEndMs / 1000 : undefined
      const normalizedRole = ['bot', 'assistant', 'ai'].includes((turn.role || '').toLowerCase())
        ? 'agent'
        : turn.role

      if (endSec == null) {
        const next = sorted[index + 1]
        const nextStartMs = next?.started_ms != null ? Math.max(0, next.started_ms - offsetMs) : null
        endSec = nextStartMs != null ? nextStartMs / 1000 : startSec + 4
      }

      if (endSec <= startSec) {
        endSec = startSec + 1
      }

      return {
        ...turn,
        role: normalizedRole,
        startSec,
        endSec,
      }
    })
  }, [detail])

  const activeTurnIndex = useMemo(() => {
    if (turnsForPlayback.length === 0) {
      return -1
    }

    const syncedTime = currentTime + SUBTITLE_SYNC_LEAD_SECONDS
    if (syncedTime < turnsForPlayback[0].startSec) {
      return -1
    }

    const latestStarted = turnsForPlayback
      .map((turn, index) => ({ index, startSec: turn.startSec }))
      .filter((turn) => turn.startSec <= syncedTime)
      .at(-1)

    return latestStarted?.index ?? 0
  }, [currentTime, turnsForPlayback])

  const activeTurn = activeTurnIndex >= 0 ? turnsForPlayback[activeTurnIndex] : null

  const effectiveDuration = useMemo(() => {
    if (duration > 0) {
      return duration
    }
    return (audio?.duration_ms ?? 0) / 1000
  }, [audio?.duration_ms, duration])

  const waveformBars = useMemo(() => {
    const barCount = 96
    const peaks = waveform?.peaks ?? []
    if (peaks.length === 0) {
      return []
    }

    return Array.from({ length: barCount }, (_, index) => {
      const start = Math.floor((index / barCount) * peaks.length)
      const end = Math.max(start + 1, Math.floor(((index + 1) / barCount) * peaks.length))
      const peak = Math.max(...peaks.slice(start, end))
      return {
        id: index,
        second: (index / (barCount - 1)) * Math.max(effectiveDuration, 1),
        height: Math.max(4, Math.round(peak * 100)),
      }
    })
  }, [effectiveDuration, waveform?.peaks])

  useEffect(() => {
    if (activeTurnIndex < 0 || lastActiveTurnRef.current === activeTurnIndex) {
      return
    }

    lastActiveTurnRef.current = activeTurnIndex
    const element = subtitleListRef.current?.querySelector(`[data-turn-index="${activeTurnIndex}"]`)
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [activeTurnIndex])

  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) {
      return
    }
    audioElement.playbackRate = playbackRate
  }, [playbackRate])

  const jumpSelection = useCallback((step: number) => {
    const currentIndex = rows.findIndex((row) => row.id === selectedId)
    if (currentIndex < 0) {
      return
    }
    const next = rows[currentIndex + step]
    if (next) {
      setSelectedId(next.id)
    }
  }, [rows, selectedId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
        return
      }
      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault()
        jumpSelection(1)
      }
      if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault()
        jumpSelection(-1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [jumpSelection])

  const formatClock = (valueInSeconds: number) => {
    if (!Number.isFinite(valueInSeconds) || valueInSeconds < 0) {
      return '0:00'
    }
    const rounded = Math.floor(valueInSeconds)
    const minutes = Math.floor(rounded / 60)
    const seconds = rounded % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  const formatCallDate = (unixSeconds: number | null) => {
    if (!unixSeconds) {
      return 'Unknown'
    }
    return formatDateTime(unixSeconds * 1000)
  }

  const togglePlayback = async () => {
    if (!audioRef.current) {
      return
    }

    if (audioRef.current.paused) {
      await audioRef.current.play().catch(() => undefined)
      return
    }

    audioRef.current.pause()
  }

  const seekToSecond = async (second: number) => {
    if (!audioRef.current) {
      return
    }

    const total = effectiveDuration > 0 ? effectiveDuration : audioRef.current.duration || Number.MAX_SAFE_INTEGER
    const safeSecond = Math.min(Math.max(second, 0), total)
    audioRef.current.currentTime = safeSecond
    setCurrentTime(safeSecond)

    if (audioRef.current.paused) {
      await audioRef.current.play().catch(() => undefined)
    }
  }

  const shiftPlayback = (seconds: number) => {
    if (!audioRef.current) {
      return
    }
    const total = effectiveDuration > 0 ? effectiveDuration : audioRef.current.duration || 0
    const next = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), total || Number.MAX_SAFE_INTEGER)
    audioRef.current.currentTime = next
    setCurrentTime(next)
  }

  const evaluationMetrics = useMemo(() => {
    const scores = evaluationRun?.metrics ?? []
    return Object.entries(METRIC_LABELS).map(([key, label]) => {
      const metric = scores.find((item) => item.metric_key === key)
      const rawScore = metric?.score_value ?? null
      return {
        key,
        label: getMetricDisplayLabel(key, label),
        score: rawScore,
        displayScore: getMetricDisplayScore(key, rawScore),
        rationale: metric?.rationale ?? null,
      }
    })
  }, [evaluationRun])

  const selectedQaSummary = useMemo(
    () => buildQaSummary(evaluationRun, insights?.warnings.length ?? 0),
    [evaluationRun, insights?.warnings.length],
  )
  const evaluationSummaryScore = selectedQaSummary.overallScore
  const selectedLowestMetric = selectedQaSummary.lowestMetric
  const selectedEvidence = useMemo(
    () => parseEvidence(selectedLowestMetric?.evidence_json ?? null, selectedLowestMetric?.rationale ?? null),
    [selectedLowestMetric],
  )

  const scoreSummaryTone = getScoreTone(evaluationSummaryScore)
  const scoreSummaryBackground =
    scoreSummaryTone === 'score-risk'
      ? 'score-summary-risk'
      : scoreSummaryTone === 'score-warning'
        ? 'score-summary-warning'
        : 'score-summary-success'

  const totalPages = Math.max(1, Math.ceil(total / CONVERSATIONS_PAGE_SIZE))

  const visiblePageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])
    return Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)
  }, [currentPage, totalPages])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const rerunEvaluation = async (conversationId: string) => {
    const provider = evaluationProviders.find((item) => item.provider_name === 'openai') ?? evaluationProviders[0]
    setError('')
    setListEvaluationLoading((current) => ({ ...current, [conversationId]: true }))
    if (conversationId === selectedId) {
      setEvaluationRun((current) => current ? { ...current, status: 'queued' } : current)
    }

    const queued = await runConversationEvaluation(
      conversationId,
      provider?.provider_name ?? 'openai',
      provider?.model_name,
    ).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to re-run evaluation')
      return null
    })

    if (queued) {
      if (conversationId === selectedId) {
        setEvaluationRun((current) => mergeEvaluationForDisplay(current, queued))
      }

      for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2500))
        const latest = await getLatestConversationEvaluation(conversationId).catch(() => null)
        if (!latest) {
          continue
        }
        if (conversationId === selectedId) {
          setEvaluationRun((current) => mergeEvaluationForDisplay(current, latest))
        }
        if (!['queued', 'running'].includes(latest.status)) {
          const summary = buildQaSummary(latest, conversationId === selectedId ? insights?.warnings.length ?? 0 : 0)
          setRows((current) => normalizeConversationListItems(current).map((row) => (
            row.id === conversationId
              ? {
                  ...row,
                  overall_score: summary.overallScore,
                  qa_verdict: summary.verdict,
                }
              : row
          )))
          break
        }
      }
    }

    setListEvaluationLoading((current) => ({ ...current, [conversationId]: false }))
  }

  useEffect(() => {
    setDetailTab('score')
  }, [selectedId])

  return (
    <section className="page conversations-workspace workspace-page">
      <div className="workspace-compact-heading">
        <div>
          <h1>Conversations</h1>
          <p className="muted">
            {preselectedAgentId
              ? `Showing calls for ${preselectedAgentName || 'selected agent'}.`
              : 'Start with the calls most likely to need a fix.'}
          </p>
        </div>
      </div>

      <div className="panel conversations-toolbar">
        <div className="conversations-toolbar-primary">
          <label className="conversation-search">
            <FontAwesomeIcon icon="magnifying-glass" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search conversations..."
              aria-label="Search conversations"
            />
          </label>
          <button
            type="button"
            className={filtersOpen || activeFilterCount > 0 ? 'workspace-filter-button active' : 'workspace-filter-button'}
            aria-expanded={filtersOpen}
            aria-controls="conversation-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <FontAwesomeIcon icon="sliders" aria-hidden="true" />
            <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          </button>
        </div>

        {filtersOpen ? (
          <div id="conversation-filters" className="conversation-filter-fields">
            <label className="toolbar-field">
              <span>Provider</span>
              <select
                value={providerFilter}
                onChange={(event) => {
                  setProviderFilter(event.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="all">All providers</option>
                {providerOptions.map((providerName) => (
                  <option key={providerName} value={providerName}>{formatProviderName(providerName)}</option>
                ))}
              </select>
            </label>
            <label className="toolbar-field">
              <span>Agent</span>
              <select
                value={preselectedAgentId || agentFilter}
                onChange={(event) => {
                  setAgentFilter(event.target.value)
                  setCurrentPage(1)
                }}
                disabled={Boolean(preselectedAgentId)}
              >
                <option value="all">All agents</option>
                {agentOptions.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </label>
            <label className="toolbar-field">
              <span>Language</span>
              <select
                value={languageFilter}
                onChange={(event) => {
                  setLanguageFilter(event.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="all">All languages</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
              </select>
            </label>
            <label className="toolbar-field">
              <span>From Date</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value)
                  setCurrentPage(1)
                }}
              />
            </label>
            <label className="toolbar-field">
              <span>To Date</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value)
                  setCurrentPage(1)
                }}
              />
            </label>
            <label className="toolbar-field">
              <span>Overall score</span>
              <select
                value={scoreFilter}
                onChange={(event) => {
                  setScoreFilter(event.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="all">Any score</option>
                <option value="red">Below 60</option>
                <option value="yellow">60–79</option>
                <option value="green">80 and above</option>
              </select>
            </label>
            <button type="button" className="conversation-clear-filters" onClick={clearFilters} disabled={activeFilterCount === 0}>
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      <div className="qa-inbox-switcher" role="tablist" aria-label="QA inbox filter">
        {([
          ['attention', 'Needs attention'],
          ['passed', 'Passed'],
          ['all', 'All'],
        ] as Array<[QaInboxFilter, string]>).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={qaInboxFilter === value}
            className={qaInboxFilter === value ? 'qa-inbox-tab active' : 'qa-inbox-tab'}
            onClick={() => {
              setQaInboxFilter(value)
              setCurrentPage(1)
            }}
          >
            {label}
          </button>
        ))}
        <span className="qa-pass-rule" title="Passed means an overall score of at least 80 with no metric below 60.">
          Passed = 80+ overall, every metric 60+
        </span>
      </div>

      <div className="conversations-grid workspace-grid">
        <aside className="panel conversations-list-panel workspace-list-panel">
          <div className="workspace-list-header">
          <strong>{total} conversations</strong>
            <span className="muted">{qaInboxFilter === 'attention' ? 'Highest risk first' : 'Newest first'}</span>
          </div>

          {loading ? (
            <p className="muted">Loading conversations...</p>
          ) : rows.length === 0 ? (
            <p className="muted">No conversations match this QA view and your current filters.</p>
          ) : (
            <ul className="conversations-list" role="listbox" aria-label="Conversations">
              {rows.map((row) => {
                const selected = row.id === selectedId
                const isEvalLoading = listEvaluationLoading[row.id] ?? false
                const scoreToneClass = getScoreTone(row.overall_score ?? null)
                const verdict = (row.qa_verdict ?? 'pending') as keyof typeof QA_VERDICT_LABELS
                return (
                  <li key={row.id}>
                    <div className={`conversation-card ${selected ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="conversation-card-select"
                        onClick={() => setSelectedId(row.id)}
                      >
                        <span className="conversation-card-title-row">
                          <span className="conversation-id">{getConversationDisplayName(row)}</span>
                          <span className="conversation-provider-badge">{formatProviderName(row.provider_name)}</span>
                        </span>
                        <span className="conversation-subtitle">Agent: {pickAgentDisplayName(row.provider_agent_name)}</span>
                        <span className="conversation-meta">
                          <FontAwesomeIcon icon="clock" /> {formatConversationDate(getConversationDisplayDate(row))}
                        </span>
                        <span className="conversation-eval-row">
                          <span className={`conversation-score-badge ${scoreToneClass} ${isEvalLoading ? 'is-loading' : ''}`}>
                            {isEvalLoading ? (
                              <>
                                <FontAwesomeIcon icon="circle-notch" spin /> Fetching
                              </>
                            ) : row.overall_score == null ? (
                              '--/100'
                            ) : (
                              `${Math.round(row.overall_score)}/100`
                            )}
                          </span>
                          <span className={`eval-status-pill qa-verdict-${verdict}`}>
                            {isEvalLoading ? <FontAwesomeIcon icon="circle-notch" spin /> : null}
                            {QA_VERDICT_LABELS[verdict] ?? verdict}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="conversation-rerun-button secondary"
                        disabled={isEvalLoading}
                        onClick={() => void rerunEvaluation(row.id)}
                      >
                        <FontAwesomeIcon icon="arrow-rotate-right" />
                        <span>Re-run evaluation</span>
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {totalPages > 1 ? (
            <div className="workspace-pagination">
              <button
                type="button"
                className="secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <div className="workspace-page-numbers">
                {visiblePageNumbers.map((page, index) => {
                  const previousPage = visiblePageNumbers[index - 1]
                  const showEllipsis = previousPage != null && page - previousPage > 1
                  return (
                    <span key={page}>
                      {showEllipsis ? <span className="page-ellipsis">…</span> : null}
                      <button
                        type="button"
                        className={page === currentPage ? 'page-number active' : 'page-number'}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </span>
                  )
                })}
              </div>
              <button
                type="button"
                className="secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </aside>

        <section className="panel conversations-detail-panel workspace-center-panel">
          {!selectedRow ? (
            <p className="muted">Select a conversation to preview details.</p>
          ) : detailLoading ? (
            <Skeleton lines={5} />
          ) : detail ? (
            <>
                <div className="workspace-detail-header">
                <div>
                  <h2>{selectedRow ? getConversationDisplayName(selectedRow) : 'Conversation review'}</h2>
                  <p className="muted">
                      Provider: {formatProviderName(selectedRow.provider_name)} · Agent: {pickAgentDisplayName(insights?.assistant_name, selectedRow.provider_agent_name)} · Duration: {effectiveDuration > 0 ? formatClock(effectiveDuration) : 'Not captured'}
                  </p>
                </div>
                  <div className="workspace-detail-actions">
                    <Link to={`/conversations/${detail.id}`} className="workspace-open-detail">
                      <FontAwesomeIcon icon="arrow-up-right-from-square" />
                      <span>Open full detail</span>
                    </Link>
                  </div>
              </div>

                <div className="workspace-tabs" role="tablist" aria-label="Conversation review tabs">
                  <button type="button" className={detailTab === 'score' ? 'workspace-tab active' : 'workspace-tab'} onClick={() => setDetailTab('score')}>
                    <FontAwesomeIcon icon="chart-line" />
                    <span>Score Breakdown</span>
                  </button>
                  <button type="button" className={detailTab === 'player' ? 'workspace-tab active' : 'workspace-tab'} onClick={() => setDetailTab('player')}>
                    <FontAwesomeIcon icon="play" />
                    <span>Call Player</span>
                  </button>
                  <button type="button" className={detailTab === 'transcript' ? 'workspace-tab active' : 'workspace-tab'} onClick={() => setDetailTab('transcript')}>
                    <FontAwesomeIcon icon="comments" />
                    <span>Transcript</span>
                  </button>
                  <button type="button" className={detailTab === 'metadata' ? 'workspace-tab active' : 'workspace-tab'} onClick={() => setDetailTab('metadata')}>
                    <FontAwesomeIcon icon="calendar" />
                    <span>Metadata</span>
                  </button>
                </div>

                {detailTab === 'score' ? (
                  <>
                    <section className="qa-diagnosis-grid" aria-label="QA diagnosis">
                      <article className={`qa-diagnosis-card qa-verdict-card qa-verdict-${selectedQaSummary.verdict}`}>
                        <small>QA verdict</small>
                        <h3>{QA_VERDICT_LABELS[selectedQaSummary.verdict]}</h3>
                        <p>{selectedQaSummary.summary}</p>
                      </article>
                      <article className="qa-diagnosis-card">
                        <small>Why this verdict</small>
                        <h3>
                          {selectedLowestMetric
                            ? `${getMetricDisplayLabel(selectedLowestMetric.metric_key, METRIC_LABELS[selectedLowestMetric.metric_key] ?? selectedLowestMetric.metric_key)} · ${getMetricDisplayScore(selectedLowestMetric.metric_key, selectedLowestMetric.score_value)}/100`
                            : 'No evaluated metric yet'}
                        </h3>
                        <p>{selectedQaSummary.failureReason}</p>
                      </article>
                      <article className="qa-diagnosis-card qa-next-step-card">
                        <small>Recommended next step</small>
                        <h3>Fix the weakest behavior first</h3>
                        <p>{selectedQaSummary.recommendedAction}</p>
                      </article>
                    </section>

                    {selectedQaSummary.supportingEvidence || selectedEvidence.length > 0 ? (
                      <section className="qa-evidence-panel">
                        <div>
                          <small>Supporting evidence</small>
                          <h3>What the evaluator saw</h3>
                        </div>
                        <div className="qa-evidence-list">
                          {selectedQaSummary.supportingEvidence ? (
                            <button
                              type="button"
                              className="qa-evidence-quote"
                              onClick={() => setDetailTab('transcript')}
                              title="Open the transcript"
                            >
                              <span>“{selectedQaSummary.supportingEvidence}”</span>
                              <small>Evaluator summary</small>
                            </button>
                          ) : null}
                          {selectedEvidence.map((item, index) => (
                            <button
                              key={`${item.text}-${index}`}
                              type="button"
                              className="qa-evidence-quote"
                              onClick={() => {
                                setDetailTab('transcript')
                                if (item.timestampMs != null) void seekToSecond(item.timestampMs / 1000)
                              }}
                              title={item.timestampMs != null || item.turnOrder != null ? 'Open this moment in the transcript' : 'Open the transcript'}
                            >
                              <span>“{item.text}”</span>
                              <small>
                                {[item.role, item.turnOrder != null ? `Turn ${item.turnOrder}` : null].filter(Boolean).join(' · ') || 'Evaluator rationale'}
                              </small>
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <section className={`panel evaluation-hero-card ${scoreSummaryBackground}`}>
                      <div className="evaluation-hero-left">
                        <small>Overall Evaluation Score</small>
                        <p>{evaluationSummaryScore == null ? '--' : `${evaluationSummaryScore}/100`}</p>
                        <span className="muted">QA score across the four evaluation metrics. Passed requires 80+ overall and every metric at 60+.</span>
                      </div>
                      <div className="evaluation-hero-right">
                        <div className="sparkline">
                          {[14, 18, 16, 20, 18, 12, 10, 16, 14, 12, 18, 16].map((height, index) => (
                            <span key={index} style={{ height: `${height}px` }} />
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="metric-grid">
                      {evaluationMetrics.map((metric) => (
                        <article key={metric.key} className="metric-card">
                          <small>{metric.label}</small>
                          <strong>{metric.displayScore == null ? '--/100' : `${metric.displayScore}/100`}</strong>
                          <div className="metric-progress-track">
                            <span className={`metric-progress-bar ${getMetricScoreTone(metric.key, metric.score)}`} style={{ width: `${metric.displayScore ?? 0}%` }} />
                          </div>
                        </article>
                      ))}
                    </section>

                    <div className="score-breakdown-panel">
                      <table className="evaluation-table workspace-evaluation-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>Score</th>
                          <th>Rationale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluationMetrics.map((metric) => (
                          <tr key={metric.key}>
                            <td>{metric.label}</td>
                            <td>
                              <span className={`score-pill ${getMetricScoreTone(metric.key, metric.score)}`}>
                                {metric.displayScore == null ? '-' : `${metric.displayScore}/100`}
                              </span>
                            </td>
                            <td>{metric.rationale ?? 'No rationale available yet.'}</td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </>
                ) : null}

                {detailTab === 'player' ? (
                  <div className="conversation-media-inline workspace-player-panel">
                    <h3>Call Player</h3>
                    {audio ? (
                      <>
                        <p className="muted">Listen and follow along with live subtitles.</p>
                    <audio
                      ref={audioRef}
                      preload="metadata"
                      crossOrigin="use-credentials"
                      src={streamUrl}
                      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                      onLoadedMetadata={(event) => {
                        const nextDuration = Number.isFinite(event.currentTarget.duration)
                          ? event.currentTarget.duration
                          : (audio.duration_ms ?? 0) / 1000
                        setDuration(nextDuration)
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                    >
                      <track kind="captions" />
                    </audio>

                    <div className="player-shell">
                      <div
                        className="player-waveform player-waveform-clickable"
                        role="group"
                        aria-label="Audio waveform. Select a bar to seek to that point in the recording."
                      >
                        <div className="player-waveform-bars">
                          {waveformBars.map((bar) => (
                            <button
                              type="button"
                              className="player-waveform-bar"
                              key={bar.id}
                              onClick={() => void seekToSecond(bar.second)}
                              aria-label={`Seek to ${formatClock(bar.second)}`}
                            >
                              <span style={{ height: `${bar.height}%` }} />
                            </button>
                          ))}
                        </div>
                        <div
                          className="player-waveform-playhead"
                          style={{ left: `${Math.min(100, Math.max(0, (currentTime / Math.max(effectiveDuration, 1)) * 100))}%` }}
                          aria-hidden="true"
                        />
                      </div>

                      <div className="player-waveform-legend" aria-hidden="true">
                        <span>Click waveform to seek</span>
                        <span>{formatClock(effectiveDuration)}</span>
                      </div>
                      {waveform?.status === 'pending' && (
                        <p className="player-waveform-status" role="status">Preparing real audio waveform…</p>
                      )}
                      {waveform?.status === 'failed' && (
                        <p className="player-audio-error" role="alert">The waveform could not be generated, but playback is still available.</p>
                      )}

                      <div className="player-timeline-group">
                        <input
                          type="range"
                          min={0}
                          max={effectiveDuration > 0 ? effectiveDuration : 1}
                          step={0.1}
                          value={Math.min(currentTime, effectiveDuration > 0 ? effectiveDuration : 1)}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value)
                            setCurrentTime(nextValue)
                            if (audioRef.current) {
                              audioRef.current.currentTime = nextValue
                            }
                          }}
                        />
                        <div className="player-time-row">
                          <span>{formatClock(currentTime)}</span>
                          <span>{formatClock(effectiveDuration)}</span>
                        </div>
                      </div>

                      <div className="player-controls-row">
                        <div className="player-primary-controls">
                          <button type="button" onClick={() => void togglePlayback()} className="player-play-button">
                            <span className="control-with-icon">
                              <FontAwesomeIcon icon={isPlaying ? 'pause' : 'play'} />
                              <span>{isPlaying ? 'Pause' : 'Play'}</span>
                            </span>
                          </button>
                          <button type="button" className="player-icon-button" onClick={() => shiftPlayback(-10)}>
                            <span className="control-with-icon">
                              <FontAwesomeIcon icon="backward" />
                              <span>Back 10s</span>
                            </span>
                          </button>
                          <button type="button" className="player-icon-button" onClick={() => shiftPlayback(10)}>
                            <span className="control-with-icon">
                              <FontAwesomeIcon icon="forward" />
                              <span>Forward 10s</span>
                            </span>
                          </button>
                        </div>

                        <div className="player-rate-row" role="group" aria-label="Playback speed">
                          {SPEED_OPTIONS.map((speed) => (
                            <button
                              key={speed}
                              type="button"
                              className={`player-rate-chip ${playbackRate === speed ? 'active' : ''}`}
                              onClick={() => setPlaybackRate(speed)}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="player-meta-row">
                        <span>Now playing</span>
                        <span>{isPlaying ? 'Audio is playing' : 'Audio is paused'}</span>
                      </div>
                    </div>

                    <div className="active-subtitle">
                      <small>{activeTurn?.role ?? 'Speaker'}</small>
                      <p>{activeTurn?.text || 'Subtitles will appear when playback starts.'}</p>
                    </div>
                  </>
                  ) : (
                    <p className="muted">Audio not available for this conversation.</p>
                  )}
                </div>
              ) : null}

              {detailTab === 'transcript' ? (
                <div className="transcript-panel">
                  <div className="transcript-header-row">
                    <h3>Transcript</h3>
                    <Link to={`/conversations/${detail.id}`} className="muted">
                      View full transcript
                    </Link>
                  </div>
                  {detail.turns.length === 0 ? (
                    <p className="muted">No turns available.</p>
                  ) : (
                    <ul className="turns compact transcript-thread" ref={subtitleListRef}>
                      {turnsForPlayback.map((turn, index) => (
                        <li
                          key={turn.id}
                          data-turn-index={index}
                          className={activeTurnIndex === index ? 'is-active' : ''}
                          onDoubleClick={() => {
                            void seekToSecond(turn.startSec)
                          }}
                          title="Double-click to jump audio here"
                        >
                          <div className={`transcript-message ${turn.role === 'agent' ? 'agent' : 'user'}`}>
                            <div className="transcript-message-head">
                              <strong>{turn.role === 'agent' ? 'Agent' : 'User'}</strong>
                              <small>{formatClock(turn.startSec)}</small>
                            </div>
                            <p>{turn.text ? turn.text : <span className="muted">No transcript text captured</span>}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {detailTab === 'metadata' ? (
                <div className="metadata-grid">
                  <article className="metadata-card">
                    <small>Conversation ID</small>
                    <strong>{detail.id}</strong>
                  </article>
                  <article className="metadata-card">
                    <small>Provider</small>
                    <strong>{formatProviderName(selectedRow.provider_name)}</strong>
                  </article>
                  <article className="metadata-card">
                    <small>Agent</small>
                    <strong>{pickAgentDisplayName(insights?.assistant_name, selectedRow.provider_agent_name)}</strong>
                  </article>
                  <article className="metadata-card">
                    <small>Language</small>
                    <strong>{selectedRow.language || 'Unknown'}</strong>
                  </article>
                  <article className="metadata-card">
                    <small>Outcome</small>
                    <strong>{humanizeOutcome(selectedRow.outcome)}</strong>
                  </article>
                  <article className="metadata-card">
                    <small>Created</small>
                    <strong>{formatConversationDate(selectedRow.created_at)}</strong>
                  </article>
                </div>
              ) : null}

              <div className="conversation-insights panel workspace-insights-panel">
                <div className="conversation-insights-header">
                  <div>
                    <h3>Provider score and insights</h3>
                    <p className="muted">Source: provider data and evaluation runs.</p>
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    disabled={insightsLoading}
                    onClick={async () => {
                      if (!selectedId) {
                        return
                      }
                      setInsightsLoading(true)
                      setInsightsError('')
                      const updated = await getConversationInsights(selectedId, true).catch((err: unknown) => {
                        setInsightsError(err instanceof Error ? err.message : 'Failed to refresh provider insights')
                        return null
                      })
                      if (updated) {
                        setInsights(updated)
                      }
                      setInsightsLoading(false)
                    }}
                  >
                    <FontAwesomeIcon icon="arrow-rotate-right" />
                    <span>{insightsLoading ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>

                {insightsError ? (
                  <p className="error">{insightsError}</p>
                ) : insights ? (
                  <>
                    <div className="conversation-kpis">
                      <article>
                        <small>Call delivery result</small>
                        <p>{insights.call_result || 'Unknown'}</p>
                      </article>
                      <article>
                        <small>Provider processing status</small>
                        <p>{insights.call_status || 'Unknown'}</p>
                      </article>
                      <article>
                        <small>Started</small>
                        <p>{formatCallDate(insights.started_at_unix)}</p>
                      </article>
                      <article>
                        <small>Environment</small>
                        <p>{insights.environment || 'Unknown'}</p>
                      </article>
                    </div>

                    {(insights.summary_title || insights.summary_text) && (
                      <div className="insight-block">
                        <h4>{insights.summary_title || 'Call summary'}</h4>
                        <p>{insights.summary_text || 'No summary available yet.'}</p>
                      </div>
                    )}

                    {insights.end_reason && (
                      <div className="insight-block">
                        <h4>How the call ended</h4>
                        <p>{humanizeDiagnosticText(insights.end_reason)}</p>
                      </div>
                    )}

                    {insights.quality_signals.length > 0 && (
                      <div className="quality-signals-grid">
                        {insights.quality_signals.map((signal) => (
                          <article key={signal.label}>
                            <small>{signal.label}</small>
                            <p>{signal.value}</p>
                          </article>
                        ))}
                      </div>
                    )}

                    {insights.warnings.length > 0 && (
                      <div className="insight-block warnings-block">
                        <h4>Attention points</h4>
                        <ul>
                          {insights.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="muted">No provider insights available yet for this call.</p>
                )}
              </div>
            </>
          ) : (
            <p className="muted">Unable to load conversation preview.</p>
          )}
        </section>
      </div>

      {error && <p className="error">{error}</p>}
    </section>
  )
}
