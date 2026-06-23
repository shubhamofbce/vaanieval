import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { API_BASE } from '../api/client'
import {
  getAudioMetadata,
  getConversation,
  getConversationInsights,
  getEvalProviderCatalog,
  getLatestConversationEvaluation,
  getEvalProviderModels,
  listEvalProviders,
  runConversationEvaluation,
} from '../api/endpoints'
import type {
  AudioAssetResponse,
  ConversationDetailResponse,
  ConversationEvaluationRunResponse,
  ConversationInsightResponse,
  EvalProviderCatalogResponse,
  EvalProviderResponse,
} from '../api/types'

const SPEED_OPTIONS = [1, 1.2, 1.5, 2]
const METRIC_LABELS: Record<string, string> = {
  task_completion_score: 'Task Completion',
  intent_understanding_score: 'Intent Understanding',
  required_info_capture_score: 'Required Info Capture',
  ai_detectability_score: 'AI Detectability',
}

function formatClock(valueInSeconds: number) {
  if (!Number.isFinite(valueInSeconds) || valueInSeconds < 0) {
    return '0:00'
  }
  const rounded = Math.floor(valueInSeconds)
  const minutes = Math.floor(rounded / 60)
  const seconds = rounded % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatConversationTitle(unixSeconds: number | null) {
  if (!unixSeconds) {
    return 'Conversation review'
  }
  const date = new Date(unixSeconds * 1000)
  if (Number.isNaN(date.getTime())) {
    return 'Conversation review'
  }
  return `Conversation on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
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

function getConversationDisplayName(conversation: ConversationDetailResponse | null, assistantName: string | null) {
  if (!conversation) {
    return 'Conversation review'
  }

  return conversation.provider_agent_name || pickAgentDisplayName(assistantName) || 'Conversation review'
}

function formatCallDate(unixSeconds: number | null) {
  if (!unixSeconds) {
    return 'Unknown'
  }
  const date = new Date(unixSeconds * 1000)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }
  return date.toLocaleString()
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

export function ConversationDetailPage() {
  const { conversationId = '' } = useParams()
  const [conversation, setConversation] = useState<ConversationDetailResponse | null>(null)
  const [audio, setAudio] = useState<AudioAssetResponse | null>(null)
  const [insights, setInsights] = useState<ConversationInsightResponse | null>(null)
  const [insightsError, setInsightsError] = useState('')
  const [evaluationRun, setEvaluationRun] = useState<ConversationEvaluationRunResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [evaluationLoading, setEvaluationLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const subtitleListRef = useRef<HTMLUListElement | null>(null)
  const lastActiveTurnRef = useRef(-1)

  // Provider/Model picker state
  const [showEvalModal, setShowEvalModal] = useState(false)
  const [availableProviders, setAvailableProviders] = useState<EvalProviderResponse[]>([])
  const [providerCatalog, setProviderCatalog] = useState<EvalProviderCatalogResponse[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('openai')
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini')
  const [modelsLoading, setModelsLoading] = useState(false)

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

  useEffect(() => {
    if (!conversationId) {
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        setInsightsError('')
        const [data, metadata, insightsData] = await Promise.all([
          getConversation(conversationId),
          getAudioMetadata(conversationId).catch(() => null),
          getConversationInsights(conversationId).catch((err: unknown) => {
            if (!cancelled) {
              setInsightsError(err instanceof Error ? err.message : 'Failed to load provider insights')
            }
            return null
          }),
        ])
        const latestEvaluation = await getLatestConversationEvaluation(conversationId).catch(() => null)
        if (!cancelled) {
          setConversation(data)
          setAudio(metadata)
          setInsights(insightsData)
          setEvaluationRun(latestEvaluation)
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load conversation')
          setConversation(null)
          setAudio(null)
          setInsights(null)
          setInsightsError('')
          setEvaluationRun(null)
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
  }, [conversationId])

  // Load available providers for evaluation
  useEffect(() => {
    if (!showEvalModal) {
      return
    }

    let cancelled = false

    const loadProviders = async () => {
      try {
        const [providers, catalog] = await Promise.all([listEvalProviders(), getEvalProviderCatalog()])
        if (!cancelled) {
          setAvailableProviders(providers)
          setProviderCatalog(catalog)
          const preferredProvider = providers.find((provider) => provider.provider_name === 'openai')?.provider_name
            ?? providers[0]?.provider_name
            ?? catalog.find((provider) => provider.provider_name === 'openai')?.provider_name
            ?? catalog[0]?.provider_name
            ?? 'openai'
          setSelectedProvider(preferredProvider)
        }
      } catch (err) {
        console.error('Failed to load eval providers:', err)
      }
    }

    void loadProviders()

    return () => {
      cancelled = true
    }
  }, [showEvalModal])

  // Load models for selected provider
  useEffect(() => {
    if (!selectedProvider) {
      return
    }

    let cancelled = false

    const loadModels = async () => {
      setModelsLoading(true)
      try {
        const response = await getEvalProviderModels(selectedProvider)
        if (!cancelled) {
          setAvailableModels(response.models)
          if (response.models.length > 0) {
            const configuredModel = availableProviders.find((provider) => provider.provider_name === selectedProvider)?.model_name
            const preferredModel = configuredModel && response.models.includes(configuredModel)
              ? configuredModel
              : response.models.includes('gpt-4o-mini')
                ? 'gpt-4o-mini'
                : response.models[0]
            setSelectedModel(preferredModel)
          }
        }
      } catch (err) {
        console.error('Failed to load provider models:', err)
        setAvailableModels([])
        setSelectedModel('')
      } finally {
        if (!cancelled) {
          setModelsLoading(false)
        }
      }
    }

    void loadModels()

    return () => {
      cancelled = true
    }
  }, [availableProviders, selectedProvider])

  useEffect(() => {
    if (!conversationId || !evaluationRun || !['queued', 'running'].includes(evaluationRun.status)) {
      return
    }

    let cancelled = false
    const intervalId = window.setInterval(() => {
      void getLatestConversationEvaluation(conversationId)
        .then((latest) => {
          if (!cancelled) {
            setEvaluationRun(latest)
          }
        })
        .catch(() => undefined)
    }, 2500)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [conversationId, evaluationRun])

  const streamUrl = useMemo(() => {
    if (!conversationId) {
      return ''
    }
    return `${API_BASE}/media/conversations/${conversationId}/audio/stream`
  }, [conversationId])

  const effectiveDuration = useMemo(() => {
    if (duration > 0) {
      return duration
    }
    if (insights?.duration_seconds) {
      return insights.duration_seconds
    }
    return (audio?.duration_ms ?? 0) / 1000
  }, [audio?.duration_ms, duration, insights?.duration_seconds])

  const turnsForPlayback = useMemo(() => {
    if (!conversation) {
      return []
    }

    const sorted = [...conversation.turns].sort((a, b) => a.turn_order - b.turn_order)
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
  }, [conversation])

  const spokenTurnsForPlayback = useMemo(
    () => turnsForPlayback.map((turn, index) => ({ ...turn, displayIndex: index })).filter((turn) => turn.role !== 'system'),
    [turnsForPlayback],
  )

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
  const visibleActiveTurn = activeTurn?.role === 'system' ? spokenTurnsForPlayback[0] ?? activeTurn : activeTurn

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

  const refreshLatestEvaluation = async () => {
    if (!conversationId) {
      return
    }
    setEvaluationLoading(true)
    const latest = await getLatestConversationEvaluation(conversationId).catch(() => null)
    setEvaluationRun((current) => mergeEvaluationForDisplay(current, latest))
    setEvaluationLoading(false)
  }

  const runEvaluation = async () => {
    if (!conversationId) {
      return
    }
    setError('')
    setEvaluationLoading(true)
    const queued = await runConversationEvaluation(
      conversationId,
      selectedProvider,
      selectedModel || undefined,
    ).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to run evaluation')
      return null
    })
    if (queued) {
      setEvaluationRun((current) => mergeEvaluationForDisplay(current, queued))
      setShowEvalModal(false)
    }
    setEvaluationLoading(false)
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

  return (
    <section className="page conversations-detail-workspace">
      {loading ? (
        <div className="panel">
          <p className="muted">Loading conversation...</p>
        </div>
      ) : conversation ? (
        <>
          <header className="panel detail-hero-panel">
            <div className="detail-hero-copy">
              <span className="detail-kicker">Conversation detail</span>
              <h1>{getConversationDisplayName(conversation, insights?.assistant_name ?? null)}</h1>
              <p className="muted">
                Provider: {conversation.provider_name || evaluationRun?.provider_name || 'Unknown'} · Agent: {pickAgentDisplayName(insights?.assistant_name, conversation.provider_agent_name)} · Duration: {formatClock(effectiveDuration)}
              </p>
            </div>
            <div className="detail-hero-actions">
              <Link className="secondary detail-back-link" to="/conversations">
                Back to conversations
              </Link>
              <button type="button" className="secondary" onClick={() => void refreshLatestEvaluation()} disabled={evaluationLoading}>
                {evaluationLoading ? 'Refreshing...' : 'Refresh latest'}
              </button>
              <button type="button" onClick={() => setShowEvalModal(true)} disabled={evaluationLoading}>
                {evaluationLoading ? 'Running...' : 'Run evaluation'}
              </button>
            </div>
          </header>

          <div className="detail-summary-grid">
            <article className={`detail-score-card ${getScoreTone(evaluationSummaryScore)}`}>
              <small>Overall evaluation score</small>
              <p>{evaluationSummaryScore == null ? '--' : `${evaluationSummaryScore}/100`}</p>
              <span className="muted">Average across the four evaluation metrics.</span>
            </article>

            <div className="detail-metric-grid">
              {evaluationMetrics.map((metric) => (
                <article key={metric.key} className="detail-metric-card">
                  <small>{metric.label}</small>
                  <span className={`score-pill ${getScoreTone(metric.score)} detail-metric-value`}>
                    {metric.score == null ? '-' : `${metric.score}/100`}
                  </span>
                  <div className="metric-progress-track">
                    <span
                      className={`metric-progress-bar ${getScoreTone(metric.score)}`}
                      style={{ width: `${metric.score ?? 0}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="detail-workspace-grid">
            <main className="detail-main-column">
              <section className="panel detail-section">
                <div className="detail-section-header">
                  <div>
                    <h3>Evaluation breakdown</h3>
                    <p className="muted">Status: {evaluationRun?.status ?? 'unknown'}{evaluationRun?.provider_name ? ` · ${evaluationRun.provider_name}` : ''}{evaluationRun?.provider_model ? ` · ${evaluationRun.provider_model}` : ''}</p>
                  </div>
                  {evaluationRun?.created_at ? <p className="muted detail-timestamp">Last evaluated: {new Date(evaluationRun.created_at).toLocaleString()}</p> : null}
                </div>

                {evaluationRun?.status === 'queued' || evaluationRun?.status === 'running' ? (
                  <div className="evaluation-status-banner">
                    <strong>Scoring in progress</strong>
                    <span>Polling latest results automatically.</span>
                  </div>
                ) : null}

                {evaluationRun?.error_message ? <p className="error">{evaluationRun.error_message}</p> : null}

                <table className="evaluation-table detail-evaluation-table">
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
                          <span className={`score-pill ${getScoreTone(metric.score)}`}>
                            {metric.score == null ? '-' : `${metric.score}/100`}
                          </span>
                        </td>
                        <td>{metric.rationale ?? 'No rationale available yet.'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="conversation-insights panel detail-section">
                <div className="conversation-insights-header">
                  <div>
                    <h3>Provider score and insights</h3>
                    <p className="muted">Source: provider data and evaluation runs.</p>
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    disabled={insightsLoading || !conversationId}
                    onClick={async () => {
                      if (!conversationId) {
                        return
                      }
                      setInsightsLoading(true)
                      setInsightsError('')
                      const updated = await getConversationInsights(conversationId, true).catch((err: unknown) => {
                        setInsightsError(err instanceof Error ? err.message : 'Failed to refresh provider insights')
                        return null
                      })
                      if (updated) {
                        setInsights(updated)
                      }
                      setInsightsLoading(false)
                    }}
                  >
                    {insightsLoading ? 'Refreshing...' : 'Refresh provider insights'}
                  </button>
                </div>

                {insightsError ? (
                  <p className="error">{insightsError}</p>
                ) : insights ? (
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
              </section>
            </main>

            <aside className="detail-side-column">
              <div className="detail-rail-sticky">
                <section className="panel detail-section detail-player-section">
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

                      <div className="player-shell player-shell-compact">
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
                        <small>{visibleActiveTurn?.role ?? 'Speaker'}</small>
                        <p>{visibleActiveTurn?.text || 'Subtitles will appear when playback starts.'}</p>
                      </div>
                    </>
                  ) : (
                    <p className="muted">Audio not available for this conversation.</p>
                  )}
                </section>

                <section className="panel detail-section transcript-preview-section">
                  <div className="transcript-header-row">
                    <h3>Transcript</h3>
                    <a href="#subtitles" className="muted">
                      Jump to subtitles
                    </a>
                  </div>
                  {turnsForPlayback.length === 0 ? (
                    <p className="muted">No turns available.</p>
                  ) : (
                    <ul className="turns compact subtitles-list" ref={subtitleListRef} id="subtitles">
                      {spokenTurnsForPlayback.map((turn) => (
                        <li
                          key={turn.id}
                          data-turn-index={turn.displayIndex}
                          className={activeTurnIndex === turn.displayIndex ? 'is-active' : ''}
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
                </section>

                <section className="panel detail-section">
                  <h3>Quick facts</h3>
                  <div className="detail-facts-grid">
                    <article>
                      <small>Conversation ID</small>
                      <strong>{conversation.id}</strong>
                    </article>
                    <article>
                      <small>Provider</small>
                      <strong>{conversation.provider_name || evaluationRun?.provider_name || 'Unknown'}</strong>
                    </article>
                    <article>
                      <small>Agent</small>
                      <strong>{pickAgentDisplayName(insights?.assistant_name, conversation.provider_agent_name)}</strong>
                    </article>
                    <article>
                      <small>Duration</small>
                      <strong>{formatClock(effectiveDuration)}</strong>
                    </article>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </>
      ) : (
        <div className="panel">
          <p className="muted">Unable to load this conversation.</p>
        </div>
      )}

      {/* Provider/Model Selection Modal */}
      {showEvalModal && (
        <div className="modal-overlay" onClick={() => setShowEvalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Run Evaluation</h3>
            <p className="muted">Choose a provider and model for evaluating this conversation.</p>
            {providerCatalog.length > 0 ? (
              <p className="muted settings-note">
                Available providers: {providerCatalog.map((provider) => provider.display_name).join(', ')}
              </p>
            ) : null}

            <div className="form-group">
              <label htmlFor="provider-select">Provider</label>
              <select
                id="provider-select"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                disabled={availableProviders.length === 0}
              >
                {availableProviders.map((provider) => (
                  <option key={provider.id} value={provider.provider_name}>
                    {provider.provider_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="model-select">Model</label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={modelsLoading || availableModels.length === 0}
              >
                {modelsLoading ? (
                  <option>Loading models...</option>
                ) : availableModels.length === 0 ? (
                  <option>No models available</option>
                ) : (
                  availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowEvalModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runEvaluation()}
                disabled={evaluationLoading || modelsLoading || !selectedModel}
              >
                {evaluationLoading ? 'Running...' : 'Run'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  )
}
