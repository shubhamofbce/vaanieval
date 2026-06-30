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
import type { DashboardOverviewResponse, DashboardTrendPoint } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend)

type RangeKey = '7d' | '30d' | '90d'

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
]

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }
  return `${(value * 100).toFixed(1)}%`
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }
  return `${value.toFixed(1)}/100`
}

function formatDuration(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }
  return `${value.toFixed(1)}s`
}

function formatDelta(value: number | null | undefined, isRate = false) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }
  const prefix = value > 0 ? '+' : ''
  return isRate ? `${prefix}${(value * 100).toFixed(1)} pts` : `${prefix}${value.toFixed(1)}`
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
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function DeltaChip({ value, isRate }: { value: number | null; isRate?: boolean }) {
  if (value == null) {
    return <span className="dashboard-delta muted">No baseline</span>
  }

  const tone = value > 0 ? 'good' : value < 0 ? 'warning' : 'default'
  return <span className={`dashboard-delta stat-${tone}`}>{formatDelta(value, isRate)}</span>
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
  const filteredPoints = points.filter((point) => point[valueKey] != null).map((point) => ({
    date: point.date,
    label: formatDateLabel(point.date),
    value:
      valueKey === 'success_rate'
        ? Number(point[valueKey]) * 100
        : Number(point[valueKey]),
  }))

  if (filteredPoints.length === 0) {
    return (
      <div className="panel dashboard-chart">
        <div className="dashboard-chart-head">
          <h3>{label}</h3>
        </div>
        <p className="muted">No data points available in this range yet.</p>
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
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
      },
    ],
  }

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) => formatter(Number(context.parsed.y ?? 0)),
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#eef2f8',
        },
        ticks: {
          color: '#64748b',
        },
      },
      y: {
        beginAtZero: true,
        min: valueKey === 'success_rate' ? 0 : undefined,
        max: valueKey === 'success_rate' ? 100 : undefined,
        grid: {
          color: '#eef2f8',
        },
        ticks: {
          color: '#64748b',
          callback: (value: string | number) => formatter(Number(value)),
        },
      },
    },
  }

  return (
    <div className="panel dashboard-chart">
      <div className="dashboard-chart-head">
        <h3>{label}</h3>
      </div>
      <div className="dashboard-trend-chart" aria-label={label}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  )
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
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard')
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
  }, [dateRange.endDate, dateRange.startDate])

  const summary = overview?.summary
  const comparison = overview?.comparison

  return (
    <section className="page workspace-page dashboard-page">
      <PageHeader
        icon="chart-line"
        title="Dashboard"
        subtitle="Track success, quality, and reliability trends for voice AI evaluations in one place."
        className="dashboard-header"
        actions={
          <div className="dashboard-range-switcher" role="tablist" aria-label="Dashboard time range">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={option.key === selectedRange ? 'workspace-filter-button active' : 'workspace-filter-button'}
                onClick={() => setSearchParams({ range: option.key })}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      {error ? <div className="panel dashboard-alert dashboard-alert-error">{error}</div> : null}
      {loading && !overview ? <div className="panel dashboard-alert">Loading dashboard...</div> : null}

      {summary ? (
        <>
          <section className="stats-grid dashboard-stats-grid">
            <StatCard icon="chart-line" label="QA pass rate" value={formatPercent(summary.success_rate)} tone="good" />
            <StatCard icon="bolt" label="Evaluation coverage" value={formatPercent(summary.evaluation_coverage_rate)} />
            <StatCard icon="table-cells-large" label="Overall score" value={formatScore(summary.average_overall_score)} />
            <StatCard icon="clock" label="Call duration p95" value={formatDuration(summary.p95_call_duration_seconds)} tone="warn" />
          </section>

          <section className="dashboard-comparison-grid">
            <article className="panel dashboard-summary-panel">
              <div className="dashboard-panel-head">
                <h2>Period comparison</h2>
                <p className="muted">
                  {overview.start_date} to {overview.end_date} vs {overview.previous_start_date} to {overview.previous_end_date}
                </p>
              </div>
              <div className="dashboard-comparison-list">
                <div>
                  <small>Conversations</small>
                  <strong>{summary.conversations}</strong>
                  <DeltaChip value={comparison?.conversations.delta ?? null} />
                </div>
                <div>
                  <small>QA-passed conversations</small>
                  <strong>{summary.successful_conversations}</strong>
                  <DeltaChip value={comparison?.successful_conversations.delta ?? null} />
                </div>
                <div>
                  <small>Evaluation coverage</small>
                  <strong>{formatPercent(summary.evaluation_coverage_rate)}</strong>
                  <DeltaChip value={comparison?.evaluation_coverage_rate.delta ?? null} isRate />
                </div>
                <div>
                  <small>Average overall score</small>
                  <strong>{formatScore(summary.average_overall_score)}</strong>
                  <DeltaChip value={comparison?.average_overall_score.delta ?? null} />
                </div>
                <div>
                  <small>Call duration p95</small>
                  <strong>{formatDuration(summary.p95_call_duration_seconds)}</strong>
                  <DeltaChip value={comparison?.p95_call_duration_seconds.delta ?? null} />
                </div>
              </div>
            </article>

            <article className="panel dashboard-summary-panel">
              <div className="dashboard-panel-head">
                <h2>Evaluation health</h2>
                <p className="muted">The first slice uses the metric keys already stored by the evaluator.</p>
              </div>
              <div className="dashboard-score-list">
                {overview.metric_summaries.map((metric) => (
                  <div key={metric.metric_key} className="dashboard-score-row">
                    <div>
                      <strong>{metric.label}</strong>
                      <small className="muted">{metric.evaluated_conversations} conversations</small>
                    </div>
                    <div className="dashboard-score-values">
                      <strong>{formatScore(metric.average_score)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="dashboard-chart-grid">
            <TrendChart
              points={overview.trend}
              valueKey="success_rate"
              label="QA pass rate trend"
              color="#0f766e"
              formatter={(value) => `${value.toFixed(0)}%`}
            />
            <TrendChart
              points={overview.trend}
              valueKey="average_call_duration_seconds"
              label="Call duration trend"
              color="#0d9488"
              formatter={(value) => `${value.toFixed(1)}s`}
            />
            <TrendChart
              points={overview.trend}
              valueKey="average_overall_score"
              label="Overall score trend"
              color="#f59e0b"
              formatter={(value) => `${value.toFixed(1)}`}
            />
          </section>

          <section className="dashboard-breakdown-grid">
            <article className="panel dashboard-breakdown-panel">
              <div className="dashboard-panel-head">
                <h2>Top agents</h2>
                <p className="muted">Quick comparison of the most active agents in the selected range.</p>
              </div>
              <div className="dashboard-agent-table">
                <div className="dashboard-agent-row dashboard-agent-row-head">
                  <span>Agent</span>
                  <span>Calls</span>
                  <span>Success</span>
                  <span>Score</span>
                </div>
                {(overview.agent_breakdown.length > 0 ? overview.agent_breakdown : []).map((agent) => (
                  <Link
                    key={`${agent.agent_id ?? agent.agent_name}`}
                    to={agent.agent_id ? `/conversations?agentId=${encodeURIComponent(agent.agent_id)}&agentName=${encodeURIComponent(agent.agent_name)}` : '/conversations'}
                    className="dashboard-agent-row dashboard-agent-link"
                  >
                    <span>{agent.agent_name}</span>
                    <span>{agent.conversations}</span>
                    <span>{formatPercent(agent.success_rate)}</span>
                    <span>{formatScore(agent.average_overall_score)}</span>
                  </Link>
                ))}
              </div>
            </article>
          </section>

          <section className="panel dashboard-callout-panel">
            <div className="dashboard-panel-head">
              <h2>Next drill-down</h2>
              <p className="muted">Use the conversation list to inspect the calls behind any score move.</p>
            </div>
            <Link to="/conversations" className="action-link">
              <FontAwesomeIcon icon="arrow-up-right-from-square" />
              <span>Open conversations</span>
            </Link>
          </section>
        </>
      ) : null}
    </section>
  )
}
