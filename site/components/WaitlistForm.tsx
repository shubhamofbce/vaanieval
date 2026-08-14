'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import { current as currentAttribution } from '@/lib/attribution'

type FormState = 'idle' | 'submitting' | 'success' | 'error'
declare global { interface Window { turnstile?: { render: (target: HTMLElement, options: { sitekey: string, callback: (token: string) => void, 'error-callback': () => void }) => string, reset: (widgetId?: string) => void } } }

const initialValues = { email: '', company: '', stack: '', companySite: '' }

export function WaitlistForm() {
  const [values, setValues] = useState(initialValues)
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState('')
  const [startedAt, setStartedAt] = useState(0)
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileWidget = useRef<string | undefined>(undefined)
  const formStarted = useRef(false)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => setStartedAt(Date.now()), [])

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileRef.current) return
    const render = () => {
      if (!window.turnstile || !turnstileRef.current || turnstileWidget.current) return
      turnstileWidget.current = window.turnstile.render(turnstileRef.current, { sitekey: turnstileSiteKey, callback: setTurnstileToken, 'error-callback': () => setTurnstileToken('') })
    }
    const existing = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]')
    if (existing) { existing.addEventListener('load', render); render(); return () => existing.removeEventListener('load', render) }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.addEventListener('load', render)
    document.head.appendChild(script)
    return () => script.removeEventListener('load', render)
  }, [turnstileSiteKey])

  const update = (field: keyof typeof initialValues, value: string) => setValues(current => ({ ...current, [field]: value }))

  function trackStart() {
    if (formStarted.current) return
    formStarted.current = true
    track('demo_request_started')
    window.gtag?.('event', 'demo_request_started')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('submitting')
    setMessage('')
    try {
      /* Read from stored attribution, not from the current URL: a visitor who
         arrives on a campaign link and submits two pages later still carries
         the source that earned them. First touch wins, because that is the
         link that was actually shared. */
      const { first, last } = currentAttribution()
      const attributed = first || last
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          source_page: window.location.pathname,
          utm_source: attributed?.source || attributed?.ref || attributed?.referrer || null,
          utm_medium: attributed?.medium || (attributed?.ref ? 'share' : null),
          utm_campaign: attributed?.campaign || null,
          form_started_at: startedAt,
          turnstileToken,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.detail || 'Unable to submit your demo request right now.')
      setState('success')
      setMessage(payload.message || 'Request received. We will be in touch within one business day.')
      track('demo_request_submitted')
      window.gtag?.('event', 'demo_request_submitted')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Unable to submit your demo request right now.')
      track('demo_request_error')
      window.gtag?.('event', 'demo_request_error')
      if (turnstileWidget.current) window.turnstile?.reset(turnstileWidget.current)
    }
  }

  if (state === 'success') return <div className="waitlist-success" role="status"><span>✓</span><h3>Request received.</h3><p>{message}</p></div>

  return <form className="waitlist-form" onSubmit={submit} onFocusCapture={trackStart}>
    <div className="waitlist-form-heading"><h3>Send us another time</h3><p>Two fields. We reply with slots within one business day.</p></div>
    <div className="waitlist-two-up"><label>Work email<input required type="email" maxLength={120} value={values.email} onChange={event => update('email', event.target.value)} autoComplete="email" /></label><label>Company<input required maxLength={160} value={values.company} onChange={event => update('company', event.target.value)} autoComplete="organization" /></label></div>
    <label>Voice platform <span>Optional</span><input maxLength={200} value={values.stack} onChange={event => update('stack', event.target.value)} placeholder="For example: LiveKit, Vapi, ElevenLabs" /></label>
    <label className="website-trap" aria-hidden="true">Company website<input tabIndex={-1} autoComplete="off" value={values.companySite} onChange={event => update('companySite', event.target.value)} /></label>
    {turnstileSiteKey && <div className="turnstile" ref={turnstileRef} />}
    {message && <p className="waitlist-error" role="alert">{message}</p>}
    <button className="voice-button" disabled={state === 'submitting'}>{state === 'submitting' ? 'Sending...' : 'Send me another time'} <span aria-hidden="true">→</span></button>
    <p className="waitlist-privacy">Please do not include customer call data or credentials.</p>
  </form>
}
