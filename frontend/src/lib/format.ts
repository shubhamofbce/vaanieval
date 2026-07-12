// Shared formatting helpers so dates and provider/outcome text read the same
// way across every page instead of drifting into raw, inconsistent strings.

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/** Formats a date/time input as an unambiguous "Jul 10, 2026, 08:14" string. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') {
    return 'Unknown'
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }
  return DATE_TIME_FORMATTER.format(date).replace(' at ', ', ')
}

/** Formats a date-only input as an unambiguous "Jul 10, 2026" string. */
export function formatDateOnly(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') {
    return 'Unknown'
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }
  return DATE_ONLY_FORMATTER.format(date)
}

/** Converts a unix-seconds timestamp into the same unambiguous date/time format. */
export function formatUnixSeconds(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) {
    return 'Unknown'
  }
  return formatDateTime(unixSeconds * 1000)
}

/** Turns `snake_case`/`kebab-case` provider values into readable labels, e.g. "customer-ended-call" -> "Customer Ended Call". */
export function humanizeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function humanizeOutcome(value: string | null | undefined): string {
  if (!value) {
    return 'Unknown'
  }
  if (value.toLowerCase() === 'false') {
    return 'Provider marked unsuccessful'
  }
  if (value.toLowerCase() === 'true') {
    return 'Provider marked successful'
  }
  if (value.toLowerCase() === 'unknown') {
    return 'Provider outcome unknown'
  }
  return humanizeLabel(value)
}

// Patterns that leak raw implementation detail (ids, tool names, braces) instead
// of a human-readable explanation. If the raw provider text matches one of
// these, show a generic, still-truthful fallback instead of internal detail.
const OPAQUE_ID_PATTERN = /\{[^}]*\}|\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i
const TECHNICAL_TERM_PATTERN = /\b(document|doc|vector|embedding|tool[_ ]?call|not found|exception|traceback|null pointer)\b/i

/** Hides raw diagnostic/provider debug text (tool ids, "not found" errors) behind a plain-English fallback. */
export function humanizeDiagnosticText(value: string | null | undefined, fallback = 'The provider did not share a detailed reason.'): string {
  if (!value?.trim()) {
    return fallback
  }
  const trimmed = value.trim()
  if (OPAQUE_ID_PATTERN.test(trimmed) || TECHNICAL_TERM_PATTERN.test(trimmed)) {
    return fallback
  }
  // Provider "end reason" codes are often snake_case/kebab-case; humanize those,
  // but leave already human-readable sentences untouched.
  const looksLikeCode = /^[a-z0-9]+([_-][a-z0-9]+)+$/i.test(trimmed)
  return looksLikeCode ? humanizeLabel(trimmed) : trimmed
}
