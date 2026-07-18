import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js'
import type { ChartOptions, TooltipItem } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { getDashboardOverview } from '../api/endpoints'
import type { DashboardMetricSummary, DashboardOverviewResponse, DashboardTrendPoint } from '../api/types'
import { StatCard } from '../components/StatCard'
import { formatDateOnly } from '../lib/format'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend)

type RangeKey = '7d' | '30d' | '90d'

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
]

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '-'
  return `${(value * 100).toFixed(1)}%`
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '-'
  return `${value.toFixed(1)}`
}

function formatScoreOutOf100(value: number | null | undefined) {
  const formatted = formatScore(value)
  return formatted === '-' ? formatted : `${formatted}/100`
}

function getSelectedRange(value: string | null): RangeKey {
  return value === '7d' || value === '30d' || value === '90d' ? value : '30d'
}

function getDateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - (days - 1))
  const toDateValue = (date: Date) => date.toISOString().slice(0, 10)
  return { startDate: toDateValue(start), endDate: toDateValue(end) }
}

function formatDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function scoreTone(value: number | null | undefined) {
  if (value == null) return 'unknown'
  if (value >= 80) return 'good'
  if (value >= 60) return 'warning'
  return 'risk'
}

function MetricScoreBar({ metric }: { metric: DashboardMetricSummary }) {
  const value = metric.average_score
  const width = value == null ? 0 : Math.max(0, Math.min(100, value))
  const tone = scoreTone(value)

  return (
    <div className="dashboard-metric-row">
      <div className="dashboard-metric-labels">
        <div>
          <strong>{metric.label}</strong>
          <small className="muted">{metric.evaluated_conversations} evaluated calls</small>
        </div>
        <span className={`dashboard-status-chip dashboard-status-${tone}`}>{formatScoreOutOf100(value)}</span>
      </div>
      <div className="dashboard-score-track" aria-label={`${metric.label} average score`}>
        <span className={`dashboard-score-fill dashboard-score-${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function TrendChart({
  points,
  valueKey,
  label,
  color,
  formatter,
}: {
  points: DashboardTrendPoint[]
  valueKey: 'success_rate' | 'average_call_duration_seconds' | 'average_overall_score'
  label: string
  color: string
  formatter: (value: number) => string
}) {
  const filteredPoints = points
    .filter((point) => point[valueKey] != null)
    .map((point) => ({
      date: point.date,
      label: formatDateLabel(point.date),
      value: valueKey === 'success_rate' ? Number(point[valueKey]) * 100 : Number(point[valueKey]),
    }))

  if (filteredPoints.length < 2) {
    return (
      <div className="dashboard-chart-empty">
        <h3>{label}</h3>
        <p className="muted">Too few dated points for a meaningful trend in this range.</p>
      </div>
    )
  }

  const chartData = {
    labels: filteredPoints.map((point) => point.label),
    datasets: [
      {
        label,
        data: filteredPoints.map((point) => point.value),
        borderColor: color,
        backgroundColor: `${color}22`,
        fill: true,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.35,
      },
    ],
  }

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) => formatter(Number(context.parsed.y ?? 0)),
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#eef2f8' },
        ticks: { color: '#64748b', maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        min: valueKey === 'success_rate' ? 0 : undefined,
        max: valueKey === 'success_rate' ? 100 : undefined,
        grid: { color: '#eef2f8' },
        ticks: {
          color: '#64748b',
          callback: (value: string | number) => formatter(Number(value)),
        },
      },
    },
  }

  return (
    <div className="dashboard-chart-card">
      <h3>{label}</h3>
      <div className="dashboard-trend-chart" aria-label={label}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  )
}

function buildInsight(overview: DashboardOverviewResponse) {
  const { summary } = overview
  if (summary.conversations === 0) {
    return 'No conversations landed in this range yet.'
  }

  const attention = summary.needs_attention_conversations
  const calls = summary.evaluated_conversations
  const weakest = summary.weakest_metric_label ? `${summary.weakest_metric_label} is the weakest metric` : 'metric scores need review'
  return `${attention} of ${calls} evaluated calls need attention; ${weakest}.`
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedRange = getSelectedRange(searchParams.get('range'))
  const selectedRangeConfig = useMemo(
    () => RANGE_OPTIONS.find((option) => option.key === selectedRange) ?? RANGE_OPTIONS[1],
    [selectedRange],
  )
  const dateRange = useMemo(() => getDateRange(selectedRangeConfig.days), [selectedRangeConfig])
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const data = await getDashboardOverview(dateRange)
        if (!cancelled) {
          setOverview(data)
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [dateRange.endDate, dateRange.startDate])

  const summary = overview?.summary
  const hasPreviousBaseline = overview
    ? Object.values(overview.comparison).some((item) => item.previous != null)
    : false
  const unknownOutcomeCount = overview?.outcome_breakdown.find((bucket) => bucket.outcome === 'unknown')?.count ?? 0
  const providerOutcomeCount = Math.max(0, (summary?.conversations ?? 0) - unknownOutcomeCount)
  const sortedMetrics = overview ? [...overview.metric_summaries].sort((a, b) => (a.average_score ?? 101) - (b.average_score ?? 101)) : []
  const hasEnoughTrendData = (summary?.conversations ?? 0) >= 10

  return (
    <section className="page workspace-page dashboard-page">
      <div className="dashboard-control-row">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Review the calls and score areas that need action next.</p>
        </div>
        <label className="dashboard-period-control">
          <span>Period</span>
          <select value={selectedRange} onChange={(event) => setSearchParams({ range: event.target.value })} aria-label="Dashboard time range">
            {RANGE_OPTIONS.map((option) => <option key={option.key} value={option.key}>Last {option.days} days</option>)}
          </select>
        </label>
      </div>

      {error ? <div className="panel dashboard-alert dashboard-alert-error">{error}</div> : null}
      {loading && !overview ? <div className="panel dashboard-alert">Loading dashboard...</div> : null}

      {summary && overview ? (
        summary.conversations === 0 ? (
          <section className="panel dashboard-empty-state">
            <span className="dashboard-empty-icon">
              <FontAwesomeIcon icon="file-import" />
            </span>
            <h2>No dashboard data for this range</h2>
            <p className="muted">Import conversations and run evaluations to populate QA coverage, score trends, and review queues.</p>
            <Link to="/import/new" className="action-link">
              <FontAwesomeIcon icon="arrow-up-right-from-square" />
              <span>Import conversations</span>
            </Link>
          </section>
        ) : (
          <>
            <section className="stats-grid dashboard-stats-grid">
              <StatCard
                icon="check-circle"
                label="QA pass rate"
                value={formatPercent(summary.success_rate)}
                tone={summary.success_rate != null && summary.success_rate < 0.8 ? 'warn' : 'good'}
                hint={summary.success_rate != null && summary.success_rate < 0.8 ? 'Below 80% target' : 'Meets 80% target'}
              />
              <StatCard
                icon="comments"
                label="Calls evaluated"
                value={`${summary.evaluated_conversations}/${summary.conversations}`}
                hint={summary.evaluated_conversations === summary.conversations ? 'All calls evaluated' : `${summary.conversations - summary.evaluated_conversations} awaiting evaluation`}
              />
              <StatCard
                icon="table-cells-large"
                label="Average quality score"
                value={formatScoreOutOf100(summary.average_overall_score)}
                tone={summary.average_overall_score != null && summary.average_overall_score < 80 ? 'warn' : 'good'}
                hint="Target 80+"
              />
              <StatCard
                icon="exclamation-triangle"
                label="Needs attention"
                value={`${summary.needs_attention_conversations}`}
                tone={summary.needs_attention_conversations > 0 ? 'warn' : 'good'}
                hint={summary.needs_attention_conversations > 0 ? 'Review these calls first' : 'Nothing flagged'}
              />
            </section>

            <section className="panel dashboard-insight-band">
              <div>
                <small>Current priority</small>
                <h2>{buildInsight(overview)}</h2>
                <p className="muted">
                  {formatDateOnly(overview.start_date)} to {formatDateOnly(overview.end_date)}
                  {hasPreviousBaseline ? `, compared with ${formatDateOnly(overview.previous_start_date)} to ${formatDateOnly(overview.previous_end_date)}.` : '. No previous baseline is available for this range.'}
                </p>
              </div>
              <Link to="#review-queue" className="dashboard-primary-action">
                <FontAwesomeIcon icon="arrow-up-right-from-square" />
                <span>See priority calls</span>
              </Link>
            </section>

            <section className="dashboard-review-workspace" id="review-queue">
              <article className="panel dashboard-review-queue">
              <div className="dashboard-panel-head">
                <div>
                  <small>Start here</small>
                  <h2>Priority review queue</h2>
                  <p className="muted">The calls most likely to improve the QA result when fixed.</p>
                </div>
                <Link to="/conversations" className="dashboard-table-link">
                  Review all calls
                </Link>
              </div>
              {overview.review_queue.length > 0 ? (
                <div className="dashboard-review-grid">
                  {overview.review_queue.map((item) => (
                    <article key={item.conversation_id} className="dashboard-review-card">
                      <div className="dashboard-review-card-topline">
                        <strong>{item.agent_name}</strong>
                        <span className="dashboard-status-chip dashboard-status-risk">{formatScoreOutOf100(item.overall_score)}</span>
                      </div>
                      <p className="dashboard-review-metric">
                        {item.weakest_metric_label ?? 'Needs review'}
                        {item.weakest_metric_score != null ? ` · ${formatScoreOutOf100(item.weakest_metric_score)}` : ''}
                      </p>
                      <p className="dashboard-review-summary">{item.qa_summary ?? 'Open the evaluation to review the evidence and next step.'}</p>
                      {item.recommended_next_step ? (
                        <p className="dashboard-review-next-step"><strong>Next fix:</strong> {item.recommended_next_step}</p>
                      ) : null}
                      <div className="dashboard-review-card-footer">
                        <small className="muted">{formatDateOnly(item.timestamp)}</small>
                        <Link to={`/conversations/${item.conversation_id}`} className="dashboard-review-link">Review call</Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dashboard-queue-clear">
                  <FontAwesomeIcon icon="check-circle" />
                  <div><strong>No calls are waiting for review.</strong><span className="muted">Every evaluated call currently passes the QA gate.</span></div>
                </div>
              )}
              </article>

              <article className="panel dashboard-summary-panel dashboard-attention-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <small>Focus area</small>
                    <h2>Attention Drivers</h2>
                    <p className="muted">Lowest scoring evaluator dimensions first.</p>
                  </div>
                </div>
                <div className="dashboard-score-list">
                  {sortedMetrics.map((metric) => <MetricScoreBar key={metric.metric_key} metric={metric} />)}
                </div>
              </article>
            </section>

            <section className="dashboard-main-grid">
              <article className="panel dashboard-summary-panel dashboard-data-quality-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <h2>Data coverage</h2>
                    <p className="muted">How complete the current evaluation and provider data is.</p>
                  </div>
                </div>
                <div className="dashboard-data-coverage-grid">
                  <div><strong>{summary.evaluated_conversations}/{summary.conversations}</strong><span>Calls evaluated</span></div>
                  <div><strong>{providerOutcomeCount}/{summary.conversations}</strong><span>Provider outcomes available</span></div>
                </div>
                {unknownOutcomeCount > 0 ? (
                  <p className="dashboard-note">
                    Provider outcomes are missing for {unknownOutcomeCount} calls. This does not affect the QA pass rate.
                  </p>
                ) : <p className="dashboard-note">Provider delivery outcome is available for every call in this range.</p>}
              </article>
            </section>

            <section className="panel dashboard-breakdown-panel">
              <div className="dashboard-panel-head">
                <div>
                  <h2>Agent Performance</h2>
                  <p className="muted">Review agents with low pass rates or weak task completion first.</p>
                </div>
              </div>
              <div className="dashboard-agent-table">
                <div className="dashboard-agent-row dashboard-agent-row-head">
                  <span>Agent</span>
                  <span>Calls</span>
                  <span>Pass rate</span>
                  <span>Avg score</span>
                  <span>Task completion</span>
                  <span>Action</span>
                </div>
                {overview.agent_breakdown.length > 0 ? (
                  overview.agent_breakdown.map((agent) => (
                    <div key={`${agent.agent_id ?? agent.agent_name}`} className="dashboard-agent-row">
                      <span>
                        <strong>{agent.agent_name}</strong>
                      </span>
                      <span>
                        {agent.conversations}
                        {agent.evaluated_conversations !== agent.conversations ? (
                          <small className="muted"> ({agent.evaluated_conversations} evaluated)</small>
                        ) : null}
                      </span>
                      <span className={`dashboard-status-chip dashboard-status-${agent.success_rate != null && agent.success_rate >= 0.8 ? 'good' : 'warning'}`}>
                        {formatPercent(agent.success_rate)}
                      </span>
                      <span>{formatScoreOutOf100(agent.average_overall_score)}</span>
                      <span>{formatScoreOutOf100(agent.average_task_completion_score)}</span>
                      <Link
                        to={agent.agent_id ? `/conversations?agentId=${encodeURIComponent(agent.agent_id)}&agentName=${encodeURIComponent(agent.agent_name)}` : '/conversations'}
                        className="dashboard-table-link"
                      >
                        Review calls
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="dashboard-empty-row muted">No agent breakdown is available for this range.</div>
                )}
              </div>
            </section>

            <section className="panel dashboard-chart-panel">
              <div className="dashboard-panel-head">
                <div>
                  <h2>Trends</h2>
                  <p className="muted">Shown only once the range has enough calls to avoid overstating a small sample.</p>
                </div>
              </div>
              {hasEnoughTrendData ? (
                <div className="dashboard-chart-grid">
                  <TrendChart points={overview.trend} valueKey="success_rate" label="QA pass rate" color="#0f766e" formatter={(value) => `${value.toFixed(0)}%`} />
                  <TrendChart points={overview.trend} valueKey="average_overall_score" label="Quality score" color="#2563eb" formatter={(value) => value.toFixed(1)} />
                  <TrendChart points={overview.trend} valueKey="average_call_duration_seconds" label="Call duration" color="#d97706" formatter={(value) => `${value.toFixed(1)}s`} />
                </div>
              ) : (
                <div className="dashboard-trend-placeholder">
                  <FontAwesomeIcon icon="chart-line" />
                  <div><strong>Trends unlock after 10 calls in this range.</strong><span className="muted">There are {summary.conversations} calls here today, so the dashboard keeps the focus on individual fixes.</span></div>
                </div>
              )}
            </section>
          </>
        )
      ) : null}
    </section>
  )
}
