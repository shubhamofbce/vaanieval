import { type FormEvent, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { PageHeader } from '../components/PageHeader'
import { getReportingSettings, saveReportingSettings, testReportingDestination } from '../api/endpoints'

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

export function ReportingSettingsPage() {
  const [form, setForm] = useState<FormState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const settings = await getReportingSettings()
        setForm((current) => ({ ...current, ...settings, email_recipient: settings.email_recipient ?? '' }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reporting settings')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      await saveReportingSettings({
        ...form,
        email_recipient: form.email_recipient || null,
        slack_webhook_url: form.slack_webhook_url || null,
      })
      setNotice('Reporting settings saved.')
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

  return <>
    <PageHeader icon="bell" title="Reporting & alerts" subtitle="Send a daily call-health summary and notify your team when provider failures spike." />
    {loading ? <div className="panel">Loading reporting settings…</div> : <form className="settings-form" onSubmit={save}>
      {error ? <div className="form-message error">{error}</div> : null}
      {notice ? <div className="form-message success">{notice}</div> : null}
      <section className="panel settings-section">
        <h2><FontAwesomeIcon icon="paper-plane" /> Destinations</h2>
        <label className="toggle-row"><input type="checkbox" checked={form.email_enabled} onChange={(e) => update('email_enabled', e.target.checked)} /> Email</label>
        <label>Email recipient<input type="email" value={form.email_recipient} onChange={(e) => update('email_recipient', e.target.value)} disabled={!form.email_enabled} placeholder="ops@example.com" /></label>
        <label className="toggle-row"><input type="checkbox" checked={form.slack_enabled} onChange={(e) => update('slack_enabled', e.target.checked)} /> Slack incoming webhook</label>
        <label>Slack webhook URL<input type="url" value={form.slack_webhook_url} onChange={(e) => update('slack_webhook_url', e.target.value)} disabled={!form.slack_enabled} placeholder="https://hooks.slack.com/services/..." /></label>
        <p className="muted">Webhook URLs are stored only for this workspace and are never displayed after saving.</p>
      </section>
      <section className="panel settings-section">
        <h2><FontAwesomeIcon icon="calendar" /> Daily report</h2>
        <label className="toggle-row"><input type="checkbox" checked={form.daily_digest_enabled} onChange={(e) => update('daily_digest_enabled', e.target.checked)} /> Send a daily digest</label>
        <label>Delivery hour (UTC)<input type="number" min="0" max="23" value={form.daily_delivery_hour_utc} onChange={(e) => update('daily_delivery_hour_utc', Number(e.target.value))} disabled={!form.daily_digest_enabled} /></label>
        <p className="muted">The digest reports the preceding completed UTC day.</p>
      </section>
      <section className="panel settings-section">
        <h2><FontAwesomeIcon icon="triangle-exclamation" /> Incident alert</h2>
        <label className="toggle-row"><input type="checkbox" checked={form.incident_alerts_enabled} onChange={(e) => update('incident_alerts_enabled', e.target.checked)} /> Alert on provider call failures</label>
        <div className="settings-grid"><label>Failure rate (%)<input type="number" min="1" max="100" value={form.incident_failure_threshold} onChange={(e) => update('incident_failure_threshold', Number(e.target.value))} disabled={!form.incident_alerts_enabled} /></label><label>Minimum calls/hour<input type="number" min="1" value={form.incident_min_calls} onChange={(e) => update('incident_min_calls', Number(e.target.value))} disabled={!form.incident_alerts_enabled} /></label></div>
        <p className="muted">One alert is sent per incident; it re-arms after the rolling one-hour window returns below the threshold.</p>
      </section>
      <div className="settings-actions"><button className="button secondary" type="button" onClick={() => void test()} disabled={testing}>{testing ? 'Sending…' : 'Send test'}</button><button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></div>
    </form>}
  </>
}
