import { type FormEvent, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { PageHeader } from '../components/PageHeader'
import { getReportingSettings, saveReportingSettings, testReportingDestination } from '../api/endpoints'
import type { ReportingSettingsResponse } from '../api/types'
import { usePersistedState } from '../lib/persistence'

type FormState = {
  email_enabled: boolean
  email_recipient: string
  slack_enabled: boolean
  slack_webhook_url: string
  daily_digest_enabled: boolean
  daily_delivery_hour_utc: number
  incident_alerts_enabled: boolean
  incident_failure_threshold: number
  incident_min_calls: number
}

const emptyState: FormState = {
  email_enabled: false, email_recipient: '', slack_enabled: false, slack_webhook_url: '',
  daily_digest_enabled: true, daily_delivery_hour_utc: 9, incident_alerts_enabled: true,
  incident_failure_threshold: 20, incident_min_calls: 10,
}

function formatTimestamp(value: string | null) {
  if (!value) return 'Not saved yet'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function enabledDestinations(form: FormState, settings: ReportingSettingsResponse | null) {
  return Number(form.email_enabled && Boolean(form.email_recipient)) + Number(form.slack_enabled && (Boolean(form.slack_webhook_url) || Boolean(settings?.slack_webhook_configured)))
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time'
}

function formatLocalDeliveryHour(hourUtc: number) {
  const date = new Date()
  date.setUTCHours(hourUtc, 0, 0, 0)
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date)
}

export function ReportingSettingsPage() {
  const [form, setForm] = useState<FormState>(emptyState)
  const [localOptions, setLocalOptions] = usePersistedState('reporting:unsaved-options', {
    email_enabled: false, email_recipient: '', slack_enabled: false,
    daily_digest_enabled: true, daily_delivery_hour_utc: 9,
    incident_failure_threshold: 20, incident_min_calls: 10,
  })
  const [settings, setSettings] = useState<ReportingSettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const result = await getReportingSettings()
        setSettings(result)
        setForm((current) => ({ ...current, ...result, ...localOptions, email_recipient: localOptions.email_recipient || result.email_recipient || '', incident_alerts_enabled: false }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reporting settings')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    setForm((current) => ({ ...current, ...localOptions, incident_alerts_enabled: false }))
  }, [localOptions])

  useEffect(() => {
    // Deliberately omit Slack webhook URLs: they are secrets, even while unsaved.
    setLocalOptions({
      email_enabled: form.email_enabled, email_recipient: form.email_recipient, slack_enabled: form.slack_enabled,
      daily_digest_enabled: form.daily_digest_enabled, daily_delivery_hour_utc: form.daily_delivery_hour_utc,
      incident_failure_threshold: form.incident_failure_threshold, incident_min_calls: form.incident_min_calls,
    })
  }, [form.email_enabled, form.email_recipient, form.slack_enabled, form.daily_digest_enabled, form.daily_delivery_hour_utc, form.incident_failure_threshold, form.incident_min_calls, setLocalOptions])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await saveReportingSettings({
        ...form,
        email_recipient: form.email_recipient || null,
        // Instant alerts are not available until continuous webhook imports ship.
        incident_alerts_enabled: false,
        // A saved webhook is intentionally not returned by the API. An empty value means keep it.
        slack_webhook_url: form.slack_webhook_url || null,
      })
      setSettings(result)
      setForm((current) => ({ ...current, slack_webhook_url: '', email_recipient: result.email_recipient ?? '' }))
      setNotice('Notification settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reporting settings')
    } finally { setSaving(false) }
  }

  async function test() {
    setTesting(true); setError(''); setNotice('')
    try {
      const result = await testReportingDestination()
      setNotice(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test notification failed')
    } finally { setTesting(false) }
  }

  const destinations = enabledDestinations(form, settings)
  const deliveryReady = destinations > 0
  const browserTimeZone = getBrowserTimeZone()

  return <>
    <PageHeader
      icon="bell"
      title="Notifications"
      subtitle="Choose where your team hears about daily call health and elevated provider failures."
      actions={<button className="button primary" type="submit" form="reporting-settings" disabled={loading || saving}>{saving ? 'Saving…' : 'Save changes'}</button>}
    />
    {loading ? <div className="panel">Loading notification settings…</div> : <form id="reporting-settings" className="reporting-form" onSubmit={save}>
      {error ? <div className="form-message error" role="alert">{error}</div> : null}
      {notice ? <div className="form-message success" role="status">{notice}</div> : null}

      <section className="reporting-status" aria-label="Notification status">
        <div className={`reporting-status-card ${deliveryReady ? 'is-ready' : 'needs-attention'}`}>
          <span className="reporting-status-icon"><FontAwesomeIcon icon={deliveryReady ? 'circle-check' : 'triangle-exclamation'} /></span>
          <div><span className="eyebrow">Delivery</span><strong>{deliveryReady ? `${destinations} destination${destinations === 1 ? '' : 's'} ready` : 'Set up a destination'}</strong><p>{deliveryReady ? 'Tests and scheduled notifications will use your enabled destinations.' : 'Add email or Slack before scheduled notifications can be delivered.'}</p></div>
        </div>
        <div className="reporting-status-card">
          <span className="eyebrow">Daily digest</span>
          <strong>{form.daily_digest_enabled ? formatLocalDeliveryHour(form.daily_delivery_hour_utc) : 'Paused'}</strong>
          <p>{form.daily_digest_enabled ? `Last sent: ${settings?.last_daily_digest_date ?? 'not yet sent'}` : 'No daily summary will be sent.'}</p>
        </div>
        <div className="reporting-status-card">
          <span className="eyebrow">Instant alerts</span>
          <strong>Coming soon</strong>
          <p>Available when continuous call imports via webhooks are enabled.</p>
        </div>
      </section>

      <section className="panel reporting-section">
        <div className="reporting-section-heading"><div><span className="eyebrow">Step 1</span><h2>Where should we notify you?</h2><p>Use one or both destinations. Your saved Slack webhook remains private.</p></div></div>
        <div className="destination-list">
          <div className={`destination-card ${form.email_enabled ? 'is-enabled' : ''}`}>
            <div className="destination-card-heading"><span className="destination-icon email"><FontAwesomeIcon icon="envelope" /></span><div><h3>Email</h3><p>Send updates to an operations inbox.</p></div><label className="switch"><input type="checkbox" checked={form.email_enabled} onChange={(e) => update('email_enabled', e.target.checked)} /><span aria-hidden="true" /><span className="sr-only">Enable email notifications</span></label></div>
            {form.email_enabled ? <label className="field-label">Recipient email<input type="email" value={form.email_recipient} onChange={(e) => update('email_recipient', e.target.value)} placeholder="ops@example.com" autoComplete="email" /></label> : <p className="destination-off">Turn on email to add a recipient.</p>}
          </div>
          <div className={`destination-card ${form.slack_enabled ? 'is-enabled' : ''}`}>
            <div className="destination-card-heading"><span className="destination-icon slack"><FontAwesomeIcon icon={['fab', 'slack']} /></span><div><h3>Slack</h3><p>Post updates to a Slack channel.</p></div><label className="switch"><input type="checkbox" checked={form.slack_enabled} onChange={(e) => update('slack_enabled', e.target.checked)} /><span aria-hidden="true" /><span className="sr-only">Enable Slack notifications</span></label></div>
            {form.slack_enabled ? <label className="field-label">Incoming webhook URL<input type="url" value={form.slack_webhook_url} onChange={(e) => update('slack_webhook_url', e.target.value)} placeholder={settings?.slack_webhook_configured ? 'Webhook saved — paste a new URL to replace it' : 'https://hooks.slack.com/services/...'} autoComplete="off" /><small>{settings?.slack_webhook_configured ? 'A webhook is already saved. Leave this blank to keep it, or paste a new URL to replace it.' : 'Create an incoming webhook for the channel that should receive alerts.'}</small></label> : <p className="destination-off">Turn on Slack to add a webhook.</p>}
          </div>
        </div>
        <div className="reporting-test-row"><div><strong>Check delivery before relying on it</strong><p>A test goes to every enabled, configured destination.</p></div><button className="button secondary" type="button" onClick={() => void test()} disabled={testing || !deliveryReady}>{testing ? 'Sending…' : 'Send test'}</button></div>
      </section>

      <section className="panel reporting-section">
        <div className="reporting-section-heading"><div><span className="eyebrow">Step 2</span><h2>Set your daily summary</h2><p>Get yesterday’s completed call activity at a predictable time in {browserTimeZone}.</p></div><label className="switch section-switch"><input type="checkbox" checked={form.daily_digest_enabled} onChange={(e) => update('daily_digest_enabled', e.target.checked)} /><span aria-hidden="true" /><span className="sr-only">Enable daily digest</span></label></div>
        {form.daily_digest_enabled ? <div className="reporting-control-row"><label className="field-label">Send time ({browserTimeZone})<select value={form.daily_delivery_hour_utc} onChange={(e) => update('daily_delivery_hour_utc', Number(e.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{formatLocalDeliveryHour(hour)}</option>)}</select></label><p className="field-explainer">Includes total calls, provider failures, and failure rate for the preceding day.</p></div> : <p className="section-paused">Daily summary is paused. Your destination settings will remain saved.</p>}
      </section>

      <section className="panel reporting-section reporting-coming-soon" aria-labelledby="instant-alerts-title">
        <div className="reporting-section-heading"><div><span className="eyebrow">Step 3 · Coming soon</span><h2 id="instant-alerts-title">Instant failure notifications</h2><p>Get notified as call failures happen, not just in the next daily summary.</p></div><label className="switch section-switch coming-soon-switch" title="Coming soon"><input type="checkbox" disabled /><span aria-hidden="true" /><span className="sr-only">Instant failure notifications are coming soon</span></label></div>
        <div className="coming-soon-message"><span className="coming-soon-icon"><FontAwesomeIcon icon="bolt" /></span><div><strong>Requires continuous call imports via webhooks</strong><p>Instant notifications will be available once your provider sends calls to VaaniEval continuously through webhooks. You can set up destinations and daily summaries above today.</p></div></div>
      </section>

      <footer className="reporting-footer"><span>Last saved: {formatTimestamp(settings?.updated_at ?? null)}</span><button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></footer>
    </form>}
  </>
}
