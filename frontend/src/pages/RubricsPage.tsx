import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getEvaluationRun, listAgents, listConversations, listRubrics, publishRubric, saveRubricDraft, testRubricOnConversation } from '../api/endpoints'
import { formatDateTime } from '../lib/format'
import type { ConversationEvaluationRunResponse, ConversationListItem, ProviderAgentResponse, RubricVersionResponse } from '../api/types'

const emptyDraft = (providerAgentId: string | null, version: number, previous?: RubricVersionResponse): RubricVersionResponse => ({
  id: null, provider_agent_id: providerAgentId, name: previous?.name ?? 'Evaluation rubric', version, status: 'draft', is_active: false,
  task_completion_instructions: previous?.task_completion_instructions ?? 'Did the agent help the caller achieve their main goal? Give a high score for a completed outcome or a clear, accurate next step the caller understands. Score lower when the request is left unresolved, information is wrong, or success is claimed without evidence. Do not penalize external limitations if the agent explains them accurately and offers a useful alternative. Cite the outcome, next step, or blocker.',
  intent_understanding_instructions: previous?.intent_understanding_instructions ?? 'Did the agent correctly understand what the caller needed? Give a high score when it responds to the actual request, asks only necessary clarifying questions, and adapts to corrections. Score lower for unsupported assumptions, repeated questions, ignored details, or responses to the wrong issue. When the request is unclear, reward clarification over guessing. Cite the caller\'s intent and the relevant response.',
  required_info_capture_instructions: previous?.required_info_capture_instructions ?? 'Did the agent collect the details needed to complete the request or move it forward? Give a high score when relevant information is captured accurately and important ambiguities are confirmed. Score lower when essential details are missing, contradictions are ignored, or the agent relies on assumptions. Do not reward unnecessary or repetitive data collection. Cite what was captured and what was missing.',
  ai_detectability_instructions: previous?.ai_detectability_instructions ?? 'Higher scores mean the agent sounded more obviously AI-generated. Increase the score for repetitive or scripted phrasing, awkward turn-taking, irrelevant responses, excessive hedging, contradictions, or poor recovery from ambiguity. Lower the score when the conversation is natural, concise, context-aware, and appropriately responsive. Do not treat transparency about being AI as a problem by itself. Cite the phrases or exchanges that support the score.',
  created_at: null, updated_at: null, published_at: null,
})

const fields = [
  ['task_completion_instructions', 'Task completion', 'Was the caller’s goal achieved?', 'Add the outcomes that count as success for your business.'],
  ['intent_understanding_instructions', 'Intent understanding', 'Did the agent correctly understand the caller?', 'Add the signals that show your agent understood the request.'],
  ['required_info_capture_instructions', 'Required information', 'Were the needed details captured?', 'List the details your team needs before a request can move forward.'],
  ['ai_detectability_instructions', 'AI detectability', 'Did the conversation feel obviously AI-generated?', 'Add behaviours that feel unnatural, repetitive, or overly scripted.'],
] as const

const metricLabels: Record<string, string> = {
  task_completion_score: 'Task completion', intent_understanding_score: 'Intent understanding',
  required_info_capture_score: 'Required information', ai_detectability_score: 'AI detectability',
}

export function RubricsPage() {
  const [agents, setAgents] = useState<ProviderAgentResponse[]>([])
  const [target, setTarget] = useState('')
  const [history, setHistory] = useState<RubricVersionResponse[]>([])
  const [draft, setDraft] = useState<RubricVersionResponse | null>(null)
  const [activeMetric, setActiveMetric] = useState<typeof fields[number][0]>('task_completion_instructions')
  const [conversationId, setConversationId] = useState('')
  const [testAgentId, setTestAgentId] = useState('')
  const [testConversations, setTestConversations] = useState<ConversationListItem[]>([])
  const [testLoading, setTestLoading] = useState(false)
  const [testRun, setTestRun] = useState<ConversationEvaluationRunResponse | null>(null)
  const [showTestResults, setShowTestResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load(targetAgentId?: string) {
    const rows = await listRubrics(targetAgentId)
    setHistory(rows)
    const latestPublished = rows.find((row) => row.status === 'published')
    setDraft(rows.find((row) => row.status === 'draft') ?? emptyDraft(targetAgentId ?? null, (latestPublished?.version ?? 0) + 1, latestPublished))
  }

  useEffect(() => {
    void Promise.all([load(), listAgents({ refresh: false })])
      .then(([, importedAgents]) => setAgents(importedAgents))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load rubrics'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!testRun || !['queued', 'running'].includes(testRun.status)) return
    const interval = window.setInterval(() => {
      void getEvaluationRun(testRun.id).then(setTestRun).catch(() => undefined)
    }, 2500)
    return () => window.clearInterval(interval)
  }, [testRun])

  useEffect(() => {
    if (testRun?.status === 'completed') setShowTestResults(true)
  }, [testRun?.status])

  async function changeTarget(value: string) {
    setTarget(value); setMessage(''); setError(''); setLoading(true)
    try { await load(value || undefined) } catch (err) { setError(err instanceof Error ? err.message : 'Could not load rubric') } finally { setLoading(false) }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft) return
    setSaving(true); setMessage(''); setError('')
    try {
      const saved = await saveRubricDraft({ provider_agent_id: draft.provider_agent_id, name: draft.name,
        task_completion_instructions: draft.task_completion_instructions, intent_understanding_instructions: draft.intent_understanding_instructions,
        required_info_capture_instructions: draft.required_info_capture_instructions, ai_detectability_instructions: draft.ai_detectability_instructions })
      setDraft(saved); await load(target || undefined); setDraft(saved); setMessage(`Draft v${saved.version} saved.`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save draft') } finally { setSaving(false) }
  }

  async function publish() {
    if (!draft?.id || !window.confirm('Publish this rubric? New evaluations will begin using it.')) return
    setSaving(true); setError('')
    try {
      const published = await publishRubric(draft.id)
      await load(target || undefined)
      setMessage(`${published.name} v${published.version} is now active. Its criteria are ready to edit as the next draft.`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not publish rubric') } finally { setSaving(false) }
  }

  async function test() {
    if (!draft?.id || !conversationId.trim()) return
    setSaving(true); setError('')
    try { const run = await testRubricOnConversation(draft.id, conversationId.trim()); setTestRun(run); setShowTestResults(false); setMessage('Test evaluation queued. Results will appear here automatically.') }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not queue test') } finally { setSaving(false) }
  }

  async function changeTestAgent(providerAgentId: string) {
    setTestAgentId(providerAgentId); setConversationId(''); setTestConversations([])
    if (!providerAgentId) return
    setTestLoading(true); setError('')
    try {
      const response = await listConversations({ agent_id: providerAgentId, limit: 100 })
      setTestConversations(response.items)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load agent conversations') } finally { setTestLoading(false) }
  }

  return <section className="page rubrics-page">
    <header className="rubrics-hero">
      <div><span className="eyebrow"><FontAwesomeIcon icon="brain" /> VaaniEval rubrics</span><h1>Evaluate calls by your standards.</h1><p>Turn your team’s definition of a great call into consistent, evidence-based QA—without changing the four scores your dashboard already tracks.</p></div>
      <div className="rubrics-hero-proof"><FontAwesomeIcon icon="shield" /><strong>Versioned by design</strong><span>Every evaluation keeps the exact rubric used.</span></div>
    </header>
    {loading || !draft ? <div className="panel">Loading your rubric workspace…</div> : <form className="rubric-editor" onSubmit={save}>
      <section className="panel rubric-editor-main"><div className="rubric-editor-heading"><div><span className="eyebrow">Configuration</span><h2>Build your evaluation rubric</h2><p>Use plain language. The evaluator sees the transcript, call outcome, language, and agent ID.</p></div><label className="rubric-target"><span>Apply to</span><select value={target} onChange={(event) => void changeTarget(event.target.value)}><option value="">Workspace default</option>{agents.map((agent) => <option key={agent.id} value={agent.provider_agent_id}>{agent.name}</option>)}</select></label></div>
        <label className="rubric-name"><span>Rubric name</span><input value={draft.name} maxLength={120} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
        <div className="rubric-guided-editor"><div className="rubric-metric-nav" role="tablist" aria-label="Rubric metrics">{fields.map(([key, label], index) => <button key={key} type="button" role="tab" aria-selected={activeMetric === key} className={activeMetric === key ? 'active' : ''} onClick={() => setActiveMetric(key)}><span>{index + 1}</span>{label}</button>)}</div>{fields.filter(([key]) => key === activeMetric).map(([key, label, question, helper]) => <div className="rubric-metric-panel" key={key} role="tabpanel"><span className="eyebrow">Metric {fields.findIndex(([field]) => field === key) + 1} of {fields.length}</span><h3>{label}</h3><p className="rubric-metric-question">{question}</p><label><span>Evaluation guidance</span><textarea rows={6} maxLength={2000} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /><small>{helper} · You can edit the VaaniEval default above.</small></label><div className="rubric-metric-controls">{fields.findIndex(([field]) => field === key) > 0 && <button type="button" className="button secondary" onClick={() => setActiveMetric(fields[fields.findIndex(([field]) => field === key) - 1][0])}>Back</button>}{fields.findIndex(([field]) => field === key) < fields.length - 1 && <button type="button" className="button secondary" onClick={() => setActiveMetric(fields[fields.findIndex(([field]) => field === key) + 1][0])}>Next metric</button>}</div></div>)}</div>
        <p className="rubric-guardrail"><FontAwesomeIcon icon="circle-info" /> Your instructions guide evaluation evidence only. VaaniEval keeps the score range, metric names, and JSON contract fixed.</p>
      </section>
      <aside className="rubric-side"><section className="panel rubric-actions"><span className="eyebrow">Draft v{draft.version}</span><h2>Ready when you are</h2><p>Save as you work. Publishing affects only future evaluations; completed calls never change silently.</p><button className="button secondary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button><button className="button primary" type="button" onClick={() => void publish()} disabled={saving || !draft.id}>Publish rubric</button>{!draft.id && <small>Save your draft before publishing.</small>}</section>
        <section className="panel rubric-test"><span className="eyebrow">Try it safely</span><h2>Test on one call</h2><p>A test uses one evaluator call and never activates this draft.</p><label><span>Agent</span><select value={testAgentId} disabled={!!testRun && ['queued', 'running'].includes(testRun.status)} onChange={(event) => void changeTestAgent(event.target.value)}><option value="">Choose an agent</option>{agents.map((agent) => <option key={agent.id} value={agent.provider_agent_id}>{agent.name}</option>)}</select></label><label><span>Conversation</span><select value={conversationId} disabled={!testAgentId || testLoading || (!!testRun && ['queued', 'running'].includes(testRun.status))} onChange={(event) => setConversationId(event.target.value)}><option value="">{testLoading ? 'Loading conversations…' : testAgentId ? 'Choose a conversation' : 'Choose an agent first'}</option>{testConversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.display_name || conversation.provider_conversation_id} · {formatDateTime(conversation.started_at || conversation.created_at)}</option>)}</select></label>{testAgentId && !testLoading && testConversations.length === 0 && <small>No imported conversations for this agent yet.</small>}<button className="button secondary" type="button" onClick={() => void test()} disabled={saving || !draft.id || !conversationId || (!!testRun && ['queued', 'running'].includes(testRun.status))}>Run test</button>{testRun && <div className={`rubric-test-result ${testRun.status}`}>{['queued', 'running'].includes(testRun.status) ? <div className="rubric-test-loading"><FontAwesomeIcon icon="spinner" spin /><div><strong>{testRun.status === 'queued' ? 'Test queued' : 'Scoring conversation'}</strong><span>{testRun.status === 'queued' ? 'Waiting for an evaluator to begin.' : 'Reading the transcript and applying your four criteria.'}</span></div></div> : <><strong>{testRun.status === 'completed' ? 'Test results ready' : 'Test failed'}</strong>{testRun.status === 'completed' && <button type="button" className="button-link" onClick={() => setShowTestResults(true)}>View four scores</button>}{testRun.error_message && <p>{testRun.error_message}</p>}<Link to={`/conversations/${testRun.conversation_id}`} target="_blank" rel="noreferrer">Open full conversation <FontAwesomeIcon icon="arrow-up-right-from-square" /></Link></>}</div>}</section>
        <section className="panel rubric-history"><span className="eyebrow">Version history</span>{history.length ? <ul>{history.map((item) => <li key={item.id ?? item.version}><strong>{item.name} v{item.version}</strong><span>{item.status}{item.is_active ? ' · Active' : ''}</span></li>)}</ul> : <p>Your published versions will appear here.</p>}</section><section className="panel rubric-coming-soon"><span className="eyebrow">Coming soon</span><h2><FontAwesomeIcon icon="sliders" /> Custom metrics</h2><p>Create metrics beyond VaaniEval’s four standard scores, with dedicated reporting and trend tracking.</p><span>Planned feature</span></section></aside>
    </form>}
    {message && <p className="note rubric-feedback" role="status">{message}</p>}{error && <p className="error rubric-feedback" role="alert">{error}</p>}
    {showTestResults && testRun?.status === 'completed' && <div className="rubric-score-modal-backdrop" role="presentation"><section className="rubric-score-modal" role="dialog" aria-modal="true" aria-labelledby="test-results-title"><button type="button" className="rubric-modal-close" onClick={() => setShowTestResults(false)} aria-label="Close test results">×</button><span className="eyebrow">Rubric test complete</span><h2 id="test-results-title">Four-score snapshot</h2><p>These scores use your current test rubric.</p><div className="rubric-test-scores">{testRun.metrics.map((metric) => <span key={metric.metric_key}>{metricLabels[metric.metric_key] ?? metric.metric_key}<b>{metric.score_value}/100</b></span>)}</div><div className="rubric-test-rationales">{testRun.metrics.map((metric) => <article key={metric.metric_key}><strong>{metricLabels[metric.metric_key] ?? metric.metric_key}</strong><p>{metric.rationale || 'No evaluator rationale was returned for this metric.'}</p></article>)}</div><Link className="button primary" to={`/conversations/${testRun.conversation_id}`} target="_blank" rel="noreferrer">Open full conversation <FontAwesomeIcon icon="arrow-up-right-from-square" /></Link></section></div>}
  </section>
}
