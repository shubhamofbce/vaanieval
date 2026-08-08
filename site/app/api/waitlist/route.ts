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

  const withDefaults = {
    ...body,
    role: typeof body.role === 'string' && body.role.trim() ? body.role.trim() : 'Not specified',
    stack: typeof body.stack === 'string' && body.stack.trim() ? body.stack.trim() : 'Not specified',
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
