import { describe, expect, it } from 'vitest'
import {
  formatDateOnly,
  formatDateTime,
  formatUnixSeconds,
  humanizeDiagnosticText,
  humanizeLabel,
  humanizeOutcome,
} from './format'

describe('formatDateTime', () => {
  it('returns Unknown for missing values', () => {
    expect(formatDateTime(null)).toBe('Unknown')
    expect(formatDateTime(undefined)).toBe('Unknown')
    expect(formatDateTime('')).toBe('Unknown')
  })

  it('returns Unknown for invalid dates', () => {
    expect(formatDateTime('not-a-date')).toBe('Unknown')
  })

  it('formats a valid date without an "at" separator', () => {
    const formatted = formatDateTime('2026-07-10T08:14:00Z')
    expect(formatted).not.toContain(' at ')
    expect(formatted).toContain('2026')
  })
})

describe('formatDateOnly', () => {
  it('returns Unknown for missing values', () => {
    expect(formatDateOnly(null)).toBe('Unknown')
  })

  it('formats a valid date', () => {
    expect(formatDateOnly('2026-07-10T08:14:00Z')).toContain('2026')
  })
})

describe('formatUnixSeconds', () => {
  it('returns Unknown for falsy values', () => {
    expect(formatUnixSeconds(null)).toBe('Unknown')
    expect(formatUnixSeconds(0)).toBe('Unknown')
  })

  it('formats a valid unix timestamp', () => {
    expect(formatUnixSeconds(1783000000)).toContain('2026')
  })
})

describe('humanizeLabel', () => {
  it('converts snake_case and kebab-case to Title Case', () => {
    expect(humanizeLabel('customer-ended-call')).toBe('Customer Ended Call')
    expect(humanizeLabel('agent_error')).toBe('Agent Error')
  })
})

describe('humanizeOutcome', () => {
  it('handles known sentinel values', () => {
    expect(humanizeOutcome(null)).toBe('Unknown')
    expect(humanizeOutcome('true')).toBe('Provider marked successful')
    expect(humanizeOutcome('false')).toBe('Provider marked unsuccessful')
    expect(humanizeOutcome('unknown')).toBe('Provider outcome unknown')
  })

  it('humanizes other values', () => {
    expect(humanizeOutcome('customer-ended-call')).toBe('Customer Ended Call')
  })
})

describe('humanizeDiagnosticText', () => {
  it('falls back for empty input', () => {
    expect(humanizeDiagnosticText(null)).toBe('The provider did not share a detailed reason.')
  })

  it('falls back when the text leaks raw ids or technical terms', () => {
    expect(humanizeDiagnosticText('doc_id={abc123}')).toBe('The provider did not share a detailed reason.')
    expect(humanizeDiagnosticText('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(
      'The provider did not share a detailed reason.',
    )
  })

  it('humanizes code-like values', () => {
    expect(humanizeDiagnosticText('call-timeout')).toBe('Call Timeout')
  })

  it('leaves human-readable sentences untouched', () => {
    expect(humanizeDiagnosticText('The customer hung up.')).toBe('The customer hung up.')
  })
})
