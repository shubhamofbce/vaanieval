import type { ConversationEvaluationRunResponse, ConversationMetricScoreResponse } from '../api/types'

export type QaVerdict = 'needs_attention' | 'review' | 'passed' | 'pending'

export type NormalizedEvidence = {
  text: string
  role: string | null
  turnOrder: number | null
  timestampMs: number | null
}

export type ConversationQaSummary = {
  overallScore: number | null
  lowestMetric: ConversationMetricScoreResponse | null
  verdict: QaVerdict
  warningCount: number
  summary: string
  failureReason: string
  recommendedAction: string
  supportingEvidence: string | null
}

export const QA_PASS_OVERALL = 80
export const QA_PASS_METRIC_FLOOR = 60
export const QA_ATTENTION_OVERALL = 60
export const QA_ATTENTION_METRIC_FLOOR = 50
export const AI_DETECTABILITY_METRIC_KEY = 'ai_detectability_score'

const RECOMMENDATIONS: Record<string, string> = {
  task_completion_score: 'Inspect the goal-completion step and the agent’s final response. Confirm that the requested outcome actually happened before the call ended.',
  intent_understanding_score: 'Inspect the first misunderstood user turn. Tighten intent clarification before the agent commits to an action.',
  required_info_capture_score: 'Verify which required fields were missed and add an explicit confirmation step before completing the workflow.',
  ai_detectability_score: 'Review repetitive phrasing, pacing, long pauses, and interruption handling to make the exchange feel more natural.',
}

export const QA_VERDICT_LABELS: Record<QaVerdict, string> = {
  needs_attention: 'Needs attention',
  review: 'Review',
  passed: 'Passed',
  pending: 'Pending evaluation',
}

function isQaVerdict(value: unknown): value is QaVerdict {
  return value === 'needs_attention' || value === 'review' || value === 'passed' || value === 'pending'
}

export function getScoreTone(score: number | null, strongThreshold = 80) {
  if (score == null) {
    return 'score-neutral'
  }
  if (score >= strongThreshold) {
    return 'score-strong'
  }
  if (score >= 60) {
    return 'score-warning'
  }
  return 'score-risk'
}

export function getMetricScoreTone(metricKey: string, score: number | null, strongThreshold = 80) {
  if (score == null) {
    return 'score-neutral'
  }
  if (metricKey === AI_DETECTABILITY_METRIC_KEY) {
    if (score < 60) {
      return 'score-strong'
    }
    if (score <= 70) {
      return 'score-warning'
    }
    return 'score-risk'
  }
  return getScoreTone(score, strongThreshold)
}

function metricQualityScore(metric: ConversationMetricScoreResponse) {
  if (metric.metric_key === AI_DETECTABILITY_METRIC_KEY) {
    if (metric.score_value < 60) return 100
    if (metric.score_value <= 70) return 70
    return Math.max(0, 100 - metric.score_value)
  }
  return metric.score_value
}

export function buildQaSummary(
  run: ConversationEvaluationRunResponse | null | undefined,
  warningCount = 0,
): ConversationQaSummary {
  const metrics = run?.metrics.filter((metric) => Number.isFinite(metric.score_value)) ?? []
  const lowestMetric = metrics.length > 0
    ? metrics.reduce((lowest, metric) => metricQualityScore(metric) < metricQualityScore(lowest) ? metric : lowest)
    : null
  const overallScore = metrics.length > 0
    ? Math.round(metrics.reduce((sum, metric) => sum + metricQualityScore(metric), 0) / metrics.length)
    : null
  const lowestQualityScore = lowestMetric ? metricQualityScore(lowestMetric) : null

  let verdict: QaVerdict = 'pending'
  if (run?.status === 'failed') {
    verdict = 'needs_attention'
  } else if (overallScore != null) {
    if (
      overallScore < QA_ATTENTION_OVERALL
      || (lowestQualityScore ?? 100) < QA_ATTENTION_METRIC_FLOOR
      || warningCount > 0
    ) {
      verdict = 'needs_attention'
    } else if (overallScore >= QA_PASS_OVERALL && (lowestQualityScore ?? 0) >= QA_PASS_METRIC_FLOOR) {
      verdict = 'passed'
    } else {
      verdict = 'review'
    }
  }

  const finalVerdict = metrics.length === 0 && isQaVerdict(run?.qa_verdict) ? run.qa_verdict : verdict

  return {
    overallScore,
    lowestMetric,
    verdict: finalVerdict,
    warningCount,
    summary: run?.qa_summary?.trim()
      || (finalVerdict === 'passed'
        ? 'This call clears the quality gate.'
        : finalVerdict === 'pending'
          ? 'Run or finish the evaluation to classify this call.'
          : 'Review the weakest behavior before changing or shipping this agent.'),
    failureReason: run?.failure_reason?.trim()
      || (lowestMetric
        ? `${lowestMetric.rationale ?? 'The evaluator flagged this metric as the weakest behavior.'}`
        : 'This conversation does not have evaluator rationale yet.'),
    recommendedAction: run?.recommended_next_step?.trim() || (lowestMetric
      ? RECOMMENDATIONS[lowestMetric.metric_key] ?? 'Review the evaluator rationale and supporting transcript evidence before changing the agent.'
      : 'Run the evaluation to get a quality verdict and prioritized recommendation.'),
    supportingEvidence: run?.supporting_evidence?.trim() || null,
  }
}

function asFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function normalizeEvidenceItem(value: unknown): NormalizedEvidence | null {
  if (typeof value === 'string') {
    const text = value.trim()
    return text ? { text, role: null, turnOrder: null, timestampMs: null } : null
  }
  if (!value || typeof value !== 'object') return null

  const item = value as Record<string, unknown>
  const textCandidate = item.text ?? item.quote ?? item.excerpt ?? item.evidence ?? item.content ?? item.message
  if (typeof textCandidate !== 'string' || !textCandidate.trim()) return null

  const roleCandidate = item.role ?? item.speaker
  const turnOrder = asFiniteNumber(item.turn_order ?? item.turnOrder ?? item.turn_index ?? item.turnIndex)
  const timestampMs = asFiniteNumber(item.timestamp_ms ?? item.timestampMs ?? item.started_ms ?? item.start_ms)
  return {
    text: textCandidate.trim(),
    role: typeof roleCandidate === 'string' ? roleCandidate : null,
    turnOrder,
    timestampMs,
  }
}

export function parseEvidence(evidenceJson: string | null, fallback: string | null): NormalizedEvidence[] {
  if (!evidenceJson?.trim()) {
    return fallback?.trim() ? [{ text: fallback.trim(), role: null, turnOrder: null, timestampMs: null }] : []
  }

  try {
    const parsed: unknown = JSON.parse(evidenceJson)
    const nested = parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>).items ?? (parsed as Record<string, unknown>).evidence
      : null
    const candidates = Array.isArray(parsed)
      ? parsed
      : Array.isArray(nested)
        ? nested
        : nested != null
          ? [nested]
          : [parsed]
    const normalized = candidates.map(normalizeEvidenceItem).filter((item): item is NormalizedEvidence => item != null)
    if (normalized.length > 0) return normalized
  } catch {
    // Evaluator output is untrusted. A readable rationale is safer than raw JSON.
  }

  return fallback?.trim() ? [{ text: fallback.trim(), role: null, turnOrder: null, timestampMs: null }] : []
}

export function qaSeverity(summary: ConversationQaSummary) {
  const rank: Record<QaVerdict, number> = { needs_attention: 0, pending: 1, review: 2, passed: 3 }
  return [rank[summary.verdict], summary.overallScore ?? -1, -summary.warningCount] as const
}
