import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { API_BASE } from '../api/client'
import {
  getAudioMetadata,
  getConversation,
  getConversationInsights,
  getLatestConversationEvaluation,
  listConversations,
  runConversationEvaluation,
} from '../api/endpoints'
import type {
  AudioAssetResponse,
  ConversationEvaluationRunResponse,
  ConversationDetailResponse,
  ConversationInsightResponse,
  ConversationListItem,
} from '../api/types'

const SPEED_OPTIONS = [1, 1.2, 1.5, 2]
const METRIC_LABELS: Record<string, string> = {
  task_completion_score: 'Task Completion',
  intent_understanding_score: 'Intent Understanding',
  required_info_capture_score: 'Required Info Capture',
  ai_detectability_score: 'AI Detectability',
}

function formatConversationTitle(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return 'Conversation'
  }
  return `Conversation on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function formatConversationCardTitle(createdAt: string, index: number) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return `Call ${index + 1}`
  }
  return `Call ${index + 1} · ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function getScoreTone(score: number | null) {
  if (score == null) {
    return 'score-neutral'
  }
  if (score >= 75) {
    return 'score-strong'
  }
  if (score >= 60) {
    return 'score-warning'
  }
  return 'score-risk'
}

export function ConversationsPage() {
  const [searchParams] = useSearchParams()
  const preselectedAgentId = searchParams.get('agentId') ?? ''
  const preselectedAgentName = searchParams.get('agentName') ?? ''
  const [rows, setRows] = useState<ConversationListItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<ConversationDetailResponse | null>(null)
  const [audio, setAudio] = useState<AudioAssetResponse | null>(null)
  const [insights, setInsights] = useState<ConversationInsightResponse | null>(null)
  const [evaluationRun, setEvaluationRun] = useState<ConversationEvaluationRunResponse | null>(null)
  const [listEvaluations, setListEvaluations] = useState<Record<string, ConversationEvaluationRunResponse | null>>({})
  const [listEvaluationLoading, setListEvaluationLoading] = useState<Record<string, boolean>>({})

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
    }
  }
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [evaluationLoading, setEvaluationLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const subtitleListRef = useRef<HTMLUListElement | null>(null)
  const lastActiveTurnRef = useRef(-1)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const data = await listConversations()
        if (!cancelled) {
          setRows(data)
          setSelectedId((current) => current || data[0]?.id || '')
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
  }, [])

  useEffect(() => {
    if (rows.length === 0) {
      setListEvaluations({})
      setListEvaluationLoading({})
      return
    }

    let cancelled = false

    const loadListEvaluations = async () => {
      const loadingState = Object.fromEntries(rows.map((row) => [row.id, true])) as Record<string, boolean>
      setListEvaluationLoading(loadingState)

      const pairs = await Promise.all(
        rows.map(async (row) => {
          const latest = await getLatestConversationEvaluation(row.id).catch(() => null)
          return [row.id, latest] as const
        }),
      )

      if (!cancelled) {
        setListEvaluations(Object.fromEntries(pairs))
        const doneState = Object.fromEntries(rows.map((row) => [row.id, false])) as Record<string, boolean>
        setListEvaluationLoading(doneState)
      }
    }

    void loadListEvaluations()

    return () => {
      cancelled = true
    }
  }, [rows])

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
          if (latest) {
            setListEvaluations((current) => ({ ...current, [selectedId]: latest }))
          }
        })
        .catch(() => undefined)
    }, 2500)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [selectedId, evaluationRun])

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return rows
      .filter((row) => {
        if (preselectedAgentId && (row.provider_agent_id ?? '') !== preselectedAgentId) {
          return false
        }
        if (!normalized) {
          return true
        }
        return [row.provider_conversation_id, row.provider_agent_id ?? '', row.outcome ?? '', row.language ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalized)
      })
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [preselectedAgentId, query, rows])

  const selectedRow = selectedId ? filteredRows.find((row) => row.id === selectedId) ?? null : null

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setAudio(null)
      setInsights(null)
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
        const [conversationData, audioData] = await Promise.all([
          getConversation(selectedId),
          getAudioMetadata(selectedId).catch(() => null),
        ])
        const insightsData = await getConversationInsights(selectedId).catch(() => null)
        const latestEvaluation = await getLatestConversationEvaluation(selectedId).catch(() => null)
        if (!cancelled) {
          setDetail(conversationData)
          setAudio(audioData)
          setInsights(insightsData)
          setEvaluationRun(latestEvaluation)
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null)
          setAudio(null)
          setInsights(null)
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

    const sorted = [...detail.turns].sort((a, b) => a.turn_order - b.turn_order)
    return sorted.map((turn, index) => {
      const fallbackStart = index === 0 ? 0 : sorted[index - 1].started_ms ?? 0
      const startSec = (turn.started_ms ?? fallbackStart) / 1000
      let endSec = turn.ended_ms != null ? turn.ended_ms / 1000 : undefined

      if (endSec == null) {
        const next = sorted[index + 1]
        endSec = next?.started_ms != null ? next.started_ms / 1000 : startSec + 4
      }

      if (endSec <= startSec) {
        endSec = startSec + 1
      }

      return {
        ...turn,
        startSec,
        endSec,
      }
    })
  }, [detail])

  const activeTurnIndex = useMemo(() => {
    if (turnsForPlayback.length === 0) {
      return -1
    }

    const insideRange = turnsForPlayback.findIndex((turn) => currentTime >= turn.startSec && currentTime < turn.endSec)
    if (insideRange >= 0) {
      return insideRange
    }

    const latestStarted = [...turnsForPlayback]
      .map((turn, index) => ({ index, startSec: turn.startSec }))
      .filter((turn) => turn.startSec <= currentTime)
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
    const bars = Array.from({ length: barCount }, () => 0.08)
    const total = effectiveDuration > 0 ? effectiveDuration : 1

    turnsForPlayback.forEach((turn) => {
      const startIndex = Math.max(0, Math.floor((turn.startSec / total) * barCount))
      const endIndex = Math.min(barCount - 1, Math.ceil((turn.endSec / total) * barCount))
      for (let index = startIndex; index <= endIndex; index += 1) {
        const densityBoost = Math.min(0.16, (turn.text.length / 220) * 0.16)
        const roleBoost = turn.role === 'agent' ? 0.16 : 0.1
        bars[index] = Math.max(bars[index], 0.2 + densityBoost + roleBoost)
      }
    })

    return bars.map((value, index) => ({
      id: index,
      height: Math.min(1, value),
      isPlayed: (index / barCount) * total <= currentTime,
    }))
  }, [currentTime, effectiveDuration, turnsForPlayback])

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

  const jumpSelection = (step: number) => {
    if (selectedIndex < 0) {
      return
    }
    const next = scoreFilteredRows[selectedIndex + step]
    if (next) {
      setSelectedId(next.id)
    }
  }

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
    const date = new Date(unixSeconds * 1000)
    if (Number.isNaN(date.getTime())) {
      return 'Unknown'
    }
    return date.toLocaleString()
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
      return {
        key,
        label,
        score: metric?.score_value ?? null,
        rationale: metric?.rationale ?? null,
      }
    })
  }, [evaluationRun])

  const evaluationSummaryScore = useMemo(() => {
    const scoredMetrics = evaluationMetrics.filter((metric) => metric.score != null)
    if (scoredMetrics.length === 0) {
      return null
    }

    const total = scoredMetrics.reduce((sum, metric) => sum + (metric.score ?? 0), 0)
    return Math.round(total / scoredMetrics.length)
  }, [evaluationMetrics])

  const getScoreToneClass = (score: number | null) => {
    if (score == null) {
      return 'score-neutral'
    }
    if (score >= 75) {
      return 'score-strong'
    }
    if (score >= 60) {
      return 'score-warning'
    }
    return 'score-risk'
  }

  const listEvaluationSummary = useMemo(() => {
    const summary: Record<string, { 
      overall: number | null
      status: string | null
      model: string | null
      metrics?: Array<{ key: string; score: number | null }>
      createdAt?: string
    }> = {}

    for (const row of rows) {
      const run = listEvaluations[row.id]
      if (!run) {
        summary[row.id] = { overall: null, status: null, model: null }
        continue
      }

      const metricScores = run.metrics
        .map((metric) => metric.score_value)
        .filter((value) => Number.isFinite(value))

      const overall = metricScores.length > 0
        ? Math.round(metricScores.reduce((sum, value) => sum + value, 0) / metricScores.length)
        : null

      const metrics = [
        { key: 'task_completion_score', score: run.metrics.find(m => m.metric_key === 'task_completion_score')?.score_value ?? null },
        { key: 'intent_understanding_score', score: run.metrics.find(m => m.metric_key === 'intent_understanding_score')?.score_value ?? null },
        { key: 'required_info_capture_score', score: run.metrics.find(m => m.metric_key === 'required_info_capture_score')?.score_value ?? null },
        { key: 'ai_detectability_score', score: run.metrics.find(m => m.metric_key === 'ai_detectability_score')?.score_value ?? null },
      ]

      summary[row.id] = {
        overall,
        status: run.status,
        model: run.provider_model,
        metrics,
        createdAt: run.created_at,
      }
    }

    return summary
  }, [listEvaluations, rows])

  const scoreFilteredRows = useMemo(() => {
    if (scoreFilter === 'all') {
      return filteredRows
    }
    return filteredRows.filter((row) => {
      const overall = listEvaluationSummary[row.id]?.overall
      if (scoreFilter === 'red' && (overall == null || overall >= 60)) {
        return false
      }
      if (scoreFilter === 'yellow' && (overall == null || overall < 60 || overall >= 75)) {
        return false
      }
      if (scoreFilter === 'green' && (overall == null || overall < 75)) {
        return false
      }
      return true
    })
  }, [filteredRows, scoreFilter, listEvaluationSummary])

  useEffect(() => {
    if (!scoreFilteredRows.some((row) => row.id === selectedId)) {
      setSelectedId(scoreFilteredRows[0]?.id || '')
    }
  }, [scoreFilteredRows, selectedId])

  const selectedIndex = useMemo(() => {
    return scoreFilteredRows.findIndex((row) => row.id === selectedId)
  }, [scoreFilteredRows, selectedId])

  const refreshLatestEvaluation = async () => {
    if (!selectedId) {
      return
    }
    setEvaluationLoading(true)
    const latest = await getLatestConversationEvaluation(selectedId).catch(() => null)
    setEvaluationRun((current) => mergeEvaluationForDisplay(current, latest))
    if (latest) {
      setListEvaluations((current) => ({ ...current, [selectedId]: latest }))
    }
    setEvaluationLoading(false)
  }

  const runEvaluation = async () => {
    if (!selectedId) {
      return
    }
    setEvaluationLoading(true)
    const queued = await runConversationEvaluation(selectedId).catch(() => null)
    if (queued) {
      setEvaluationRun((current) => mergeEvaluationForDisplay(current, queued))
      setListEvaluations((current) => ({ ...current, [selectedId]: queued }))
    }
    const latest = await getLatestConversationEvaluation(selectedId).catch(() => null)
    setEvaluationRun((current) => mergeEvaluationForDisplay(current, latest))
    if (latest) {
      setListEvaluations((current) => ({ ...current, [selectedId]: latest }))
    }
    setEvaluationLoading(false)
  }

  return (
    <section className="page conversations-workspace">
      <header className="conversations-header panel">
        <div>
          <h1>Conversations</h1>
          <p className="muted">
            {preselectedAgentId
              ? `Showing calls for ${preselectedAgentName || 'selected agent'}.`
              : 'High-speed review mode for imported calls.'}
          </p>
        </div>
        <div className="conversations-summary">
          <span>{scoreFilteredRows.length} visible</span>
          <span>{rows.length} total</span>
        </div>
      </header>

      <div className="panel conversations-toolbar">
        <label className="toolbar-field">
          <span>
            <FontAwesomeIcon icon="magnifying-glass" /> Search
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by conversation or agent"
          />
        </label>
        <label className="toolbar-field">
          <span>
            <FontAwesomeIcon icon="star" /> Score
          </span>
          <select value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value)}>
            <option value="all">All scores</option>
            <option value="red">Red (&lt; 60)</option>
            <option value="yellow">Yellow (60-75)</option>
            <option value="green">Green (75+)</option>
          </select>
        </label>
      </div>

      <div className="conversations-grid">
        <aside className="panel conversations-list-panel">
          <div className="inline conversations-list-actions">
            <span className="muted shortcuts-hint">Shortcuts: J/K or Arrow keys</span>
            <button
              type="button"
              className="secondary"
              onClick={() => jumpSelection(-1)}
              disabled={selectedIndex <= 0}
            >
              Previous
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => jumpSelection(1)}
              disabled={selectedIndex < 0 || selectedIndex >= scoreFilteredRows.length - 1}
            >
              Next
            </button>
          </div>

          {loading ? (
            <p className="muted">Loading conversations...</p>
          ) : scoreFilteredRows.length === 0 ? (
            <p className="muted">No conversations match your filters.</p>
          ) : (
            <ul className="conversations-list" role="listbox" aria-label="Conversations">
              {scoreFilteredRows.map((row, index) => {
                const selected = row.id === selectedId
                const evalSummary = listEvaluationSummary[row.id]
                const isEvalLoading = listEvaluationLoading[row.id] ?? false
                const scoreToneClass = getScoreTone(evalSummary?.overall ?? null)
                const status = evalSummary?.status ?? null
                const statusClass =
                  status === 'completed'
                    ? 'eval-status-completed'
                    : status === 'failed'
                      ? 'eval-status-failed'
                      : status === 'queued' || status === 'running'
                        ? 'eval-status-pending'
                        : 'eval-status-idle'
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`conversation-card ${selected ? 'active' : ''}`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <span className="conversation-id">{formatConversationCardTitle(row.created_at, index)}</span>
                      <span className="conversation-meta">
                        <FontAwesomeIcon icon="headset" /> Voice assistant call
                      </span>
                      <span className="conversation-meta">
                        <FontAwesomeIcon icon="calendar" /> {new Date(row.created_at).toLocaleString()}
                      </span>
                      <span className="conversation-eval-row">
                        <span className={`score-pill ${scoreToneClass} ${isEvalLoading ? 'is-loading' : ''}`}>
                          {isEvalLoading ? (
                            <>
                              <FontAwesomeIcon icon="circle-notch" spin /> Fetching
                            </>
                          ) : evalSummary?.overall == null ? (
                            'No eval'
                          ) : (
                            `${evalSummary.overall}/100`
                          )}
                        </span>
                        <span className={`eval-status-pill ${statusClass}`}>
                          {(status === 'queued' || status === 'running') && <FontAwesomeIcon icon="circle-notch" spin />}
                          {status ? `Eval ${status}` : 'Eval not run'}
                          {evalSummary?.model ? ` · ${evalSummary.model}` : ''}
                        </span>
                      </span>
                      {evalSummary?.metrics && evalSummary.metrics.length > 0 && (
                        <span className="conversation-metrics-summary">
                          {evalSummary.metrics.map((metric) => (
                            <span key={metric.key} className={`metric-mini ${getScoreTone(metric.score)}`} title={METRIC_LABELS[metric.key]}>
                              {metric.score == null ? '-' : metric.score}
                            </span>
                          ))}
                        </span>
                      )}
                      {evalSummary?.createdAt && (
                        <span className="conversation-eval-time">
                          {new Date(evalSummary.createdAt).toLocaleString()}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className="panel conversations-detail-panel">
          {!selectedRow ? (
            <p className="muted">Select a conversation to preview details.</p>
          ) : detailLoading ? (
            <p className="muted">Loading selected conversation...</p>
          ) : detail ? (
            <>
              <div className="conversations-detail-header">
                <div>
                  <h2>{selectedRow ? formatConversationTitle(selectedRow.created_at) : 'Conversation review'}</h2>
                  <p className="muted">Agent: {insights?.assistant_name || 'Voice assistant'}</p>
                </div>
                <Link to={`/conversations/${detail.id}`}>Open full detail</Link>
              </div>

              <div className="conversation-insights panel">
                <div className="conversation-insights-header">
                  <h3>Evaluation scores</h3>
                  <div className="inline">
                    <button type="button" className="secondary" onClick={() => void refreshLatestEvaluation()} disabled={evaluationLoading}>
                      {evaluationLoading ? 'Refreshing...' : 'Refresh latest'}
                    </button>
                    <button type="button" onClick={() => void runEvaluation()} disabled={evaluationLoading}>
                      {evaluationLoading ? 'Running...' : 'Run evaluation'}
                    </button>
                  </div>
                </div>
                {evaluationRun ? (
                  <>
                    <p className="muted">
                      Status: {evaluationRun.status}
                      {evaluationRun.provider_model ? ` · ${evaluationRun.provider_model}` : ''}
                    </p>
                    {evaluationRun.error_message ? <p className="error">{evaluationRun.error_message}</p> : null}
                  </>
                ) : (
                  <p className="muted">No evaluation run found yet for this conversation.</p>
                )}
                {evaluationRun?.status === 'queued' || evaluationRun?.status === 'running' ? (
                  <div className="evaluation-status-banner">
                    <strong>
                      <FontAwesomeIcon icon="circle-notch" spin /> Scoring in progress
                    </strong>
                    <span>Fetching updated results shortly.</span>
                  </div>
                ) : null}

                <div className="evaluation-summary">
                  <article className={`evaluation-summary-card ${getScoreToneClass(evaluationSummaryScore)}`}>
                    <small>Overall evaluation score</small>
                    <p>{evaluationSummaryScore == null ? '--' : `${evaluationSummaryScore}/100`}</p>
                    <span className="muted">Average across the four evaluation metrics.</span>
                  </article>

                  <div className="quality-signals-grid">
                    {evaluationMetrics.map((metric) => (
                      <article key={metric.key}>
                        <small>{metric.label}</small>
                        <p className={getScoreToneClass(metric.score)}>{metric.score == null ? '-' : `${metric.score}/100`}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <table className="evaluation-table">
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
                          <span className={`score-pill ${getScoreToneClass(metric.score)}`}>
                            {metric.score == null ? '-' : `${metric.score}/100`}
                          </span>
                        </td>
                        <td>{metric.rationale ?? 'No rationale available yet.'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="conversation-media-inline">
                <h3>Call player</h3>
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
                      <div className="player-waveform" aria-hidden="true">
                        {waveformBars.map((bar) => (
                          <span
                            key={bar.id}
                            className={`player-wave-bar ${bar.isPlayed ? 'is-played' : ''}`}
                            style={{ height: `${Math.max(8, Math.round(bar.height * 48))}px` }}
                          />
                        ))}
                      </div>

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

              <div>
                <h3>Subtitles</h3>
                {detail.turns.length === 0 ? (
                  <p className="muted">No turns available.</p>
                ) : (
                  <ul className="turns compact subtitles-list" ref={subtitleListRef}>
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
                        <strong>{turn.role}</strong>
                        <p>{turn.text || '...'}</p>
                        <small>{formatClock(turn.startSec)}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="conversation-insights panel">
                <div className="conversation-insights-header">
                  <div>
                    <h3>Provider score and insights</h3>
                    <p className="muted">Source: ElevenLabs provider data (not VaaniEval scoring).</p>
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
                      const updated = await getConversationInsights(selectedId, true).catch(() => null)
                      if (updated) {
                        setInsights(updated)
                      }
                      setInsightsLoading(false)
                    }}
                  >
                    {insightsLoading ? 'Refreshing...' : 'Refresh provider insights'}
                  </button>
                </div>

                {insights ? (
                  <>
                    <div className="conversation-kpis">
                      <article>
                        <small>Call result</small>
                        <p>{insights.call_result || 'Unknown'}</p>
                      </article>
                      <article>
                        <small>Status</small>
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
                        <p>{insights.end_reason}</p>
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
