'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'

type FormState = 'idle' | 'submitting' | 'success' | 'error'
declare global { interface Window { turnstile?: { render: (target: HTMLElement, options: { sitekey: string, callback: (token: string) => void, 'error-callback': () => void }) => string, reset: (widgetId?: string) => void } } }

const initialValues = { name: '', email: '', company: '', role: '', website: '', stack: '', challenge: '', companySite: '' }

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
    track('design_partner_waitlist_started')
    window.gtag?.('event', 'design_partner_waitlist_started')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('submitting')
    setMessage('')
    try {
      const params = new URLSearchParams(window.location.search)
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          source_page: window.location.pathname,
          utm_source: params.get('utm_source'),
          utm_medium: params.get('utm_medium'),
          utm_campaign: params.get('utm_campaign'),
          form_started_at: startedAt,
          turnstileToken,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.detail || 'Unable to submit your application right now.')
      setState('success')
      setMessage(payload.message || 'You are on the list. I will be in touch soon.')
      track('design_partner_waitlist_submitted')
      window.gtag?.('event', 'design_partner_waitlist_submitted')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Unable to submit your application right now.')
      track('design_partner_waitlist_error')
      window.gtag?.('event', 'design_partner_waitlist_error')
      if (turnstileWidget.current) window.turnstile?.reset(turnstileWidget.current)
    }
  }

  if (state === 'success') return <div className="waitlist-success" role="status"><span>✓</span><h3>Application received.</h3><p>{message}</p></div>

  return <form className="waitlist-form" onSubmit={submit} onFocusCapture={trackStart}>
    <div className="waitlist-form-heading"><h3>Apply for early access</h3><p>Tell us about the Voice AI workflow you are building.</p></div>
    <div className="waitlist-two-up"><label>Name<input required value={values.name} onChange={event => update('name', event.target.value)} autoComplete="name" /></label><label>Work email<input required type="email" value={values.email} onChange={event => update('email', event.target.value)} autoComplete="email" /></label></div>
    <div className="waitlist-two-up"><label>Company<input required value={values.company} onChange={event => update('company', event.target.value)} autoComplete="organization" /></label><label>Role<input required value={values.role} onChange={event => update('role', event.target.value)} /></label></div>
    <label>Website or LinkedIn <span>Optional</span><input type="url" value={values.website} onChange={event => update('website', event.target.value)} placeholder="https://" /></label>
    <label>Voice AI stack<input required value={values.stack} onChange={event => update('stack', event.target.value)} placeholder="For example: LiveKit, ElevenLabs, Vapi" /></label>
    <label>Your biggest quality or evaluation challenge<textarea required rows={3} value={values.challenge} onChange={event => update('challenge', event.target.value)} /></label>
    <label className="website-trap" aria-hidden="true">Company website<input tabIndex={-1} autoComplete="off" value={values.companySite} onChange={event => update('companySite', event.target.value)} /></label>
    {turnstileSiteKey && <div className="turnstile" ref={turnstileRef} />}
    {message && <p className="waitlist-error" role="alert">{message}</p>}
    <button className="voice-button" disabled={state === 'submitting'}>{state === 'submitting' ? 'Sending application...' : 'Apply for design partner access'} <span aria-hidden="true">→</span></button>
    <p className="waitlist-privacy">No customer call data or credentials, please.</p>
  </form>
}
