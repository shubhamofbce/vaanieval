import { NextRequest, NextResponse } from 'next/server'

const apiUrl = process.env.VAANIEVAL_API_URL
const ingestToken = process.env.WAITLIST_INGEST_TOKEN
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY

export async function POST(request: NextRequest) {
  if (!apiUrl || !ingestToken) return NextResponse.json({ detail: 'Waitlist applications are not configured yet.' }, { status: 503 })
  const body = await request.json()

  if (typeof body.companySite === 'string' && body.companySite.trim()) {
    return NextResponse.json({ message: 'Thanks, your application has been received.' }, { status: 202 })
  }
  if (typeof body.form_started_at !== 'number' || Date.now() - body.form_started_at < 2000) {
    return NextResponse.json({ detail: 'Please take a moment to complete the application.' }, { status: 400 })
  }

  if (process.env.NODE_ENV === 'production') {
    if (!turnstileSecret || !body.turnstileToken) return NextResponse.json({ detail: 'Please complete the verification step and try again.' }, { status: 400 })
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: turnstileSecret, response: body.turnstileToken }),
    })
    const result = await verification.json().catch(() => ({ success: false }))
    if (!result.success) return NextResponse.json({ detail: 'Verification failed. Please try again.' }, { status: 400 })
  }

  // The short demo form only collects email, company, and an optional platform.
  // The backend schema still requires these fields, so fill them server-side.
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : '')
  const clamp = (value: string, max: number) => value.slice(0, max)
  const email = text(body.email)
  const withDefaults = {
    ...body,
    name: clamp(text(body.name) || email.split('@')[0] || 'Not provided', 120),
    email,
    company: clamp(text(body.company), 160),
    role: clamp(text(body.role) || 'Not provided', 120),
    website: text(body.website) ? clamp(text(body.website), 2048) : undefined,
    stack: clamp(text(body.stack) || 'Not provided', 1000),
    challenge: clamp(text(body.challenge) || 'Requested a benchmark review from the website.', 4000),
    source_page: text(body.source_page) ? clamp(text(body.source_page), 512) : undefined,
    utm_source: text(body.utm_source) ? clamp(text(body.utm_source), 512) : undefined,
    utm_medium: text(body.utm_medium) ? clamp(text(body.utm_medium), 512) : undefined,
    utm_campaign: text(body.utm_campaign) ? clamp(text(body.utm_campaign), 512) : undefined,
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/v1/waitlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Waitlist-Ingest-Token': ingestToken,
    },
    body: JSON.stringify({ ...withDefaults, turnstileToken: undefined, companySite: undefined }),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({ detail: 'Unable to submit your application right now.' }))
  return NextResponse.json(payload, { status: response.status })
}
