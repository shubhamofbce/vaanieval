import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { StatusPill } from '../components/StatusPill'
import { formatDateTime } from '../lib/format'
import {
  connectEvalProvider,
  connectProvider,
  getEvalProviderCatalog,
  listAgents,
  listProviderConnections,
  listEvalProviders,
  testProviderConnection,
} from '../api/endpoints'
import type {
  EvalProviderCatalogResponse,
  EvalProviderResponse,
  ProviderConnectionListItem,
} from '../api/types'
import { usePersistedState } from '../lib/persistence'

const providerDisplayName = (providerName: string) => {
  if (providerName === 'elevenlabs') return 'ElevenLabs'
  if (providerName === 'vapi') return 'Vapi'
  if (providerName === 'bolna') return 'Bolna'
  if (providerName === 'openai') return 'OpenAI'
  return providerName
}

export function ProviderPage() {
  const [providerConnections, setProviderConnections] = useState<ProviderConnectionListItem[]>([])
  const [agentCountByAccount, setAgentCountByAccount] = useState<Record<string, number>>({})
  const [connectionState, setConnectionState] = useState<Record<string, 'checked' | 'attention'>>({})
  const [showConnectForm, setShowConnectForm] = usePersistedState('provider:connect-panel-open', false)
  const [managedConnectionId, setManagedConnectionId] = useState('')
  const [providerName, setProviderName] = usePersistedState('provider:selected-provider', 'elevenlabs')
  const [apiKey, setApiKey] = useState('')
  const [isSavingProvider, setIsSavingProvider] = useState(false)
  const [isRefreshingId, setIsRefreshingId] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const [evalCatalog, setEvalCatalog] = useState<EvalProviderCatalogResponse[]>([])
  const [configuredEvalProviders, setConfiguredEvalProviders] = useState<EvalProviderResponse[]>([])
  const [evalProviderName, setEvalProviderName] = usePersistedState('provider:eval-provider', 'openai')
  const [evalModelName, setEvalModelName] = usePersistedState('provider:eval-model', 'gpt-4o-mini')
  const [evalApiKey, setEvalApiKey] = useState('')
  const [showEvalForm, setShowEvalForm] = usePersistedState('provider:eval-panel-open', false)
  const [evalResult, setEvalResult] = useState('')
  const [evalError, setEvalError] = useState('')
  const [evalSaving, setEvalSaving] = useState(false)
  const [evalLoading, setEvalLoading] = useState(true)

  const selectedEvalProvider = useMemo(
    () => evalCatalog.find((entry) => entry.provider_name === evalProviderName) ?? null,
    [evalCatalog, evalProviderName],
  )
  const configuredEvalProvider = useMemo(
    () => configuredEvalProviders.find((provider) => provider.provider_name === evalProviderName) ?? configuredEvalProviders[0] ?? null,
    [configuredEvalProviders, evalProviderName],
  )
  const managedConnection = providerConnections.find((connection) => connection.id === managedConnectionId) ?? null

  async function loadConnections() {
    const connections = await listProviderConnections()
    setProviderConnections(connections)
    if (connections.length === 0) {
      setAgentCountByAccount({})
      return
    }
    const agents = await listAgents({ refresh: false })
    setAgentCountByAccount(agents.reduce<Record<string, number>>((counts, agent) => {
      counts[agent.provider_account_id] = (counts[agent.provider_account_id] ?? 0) + 1
      return counts
    }, {}))
  }
  useEffect(() => {
    void loadConnections().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load connections'))
  }, [])


  useEffect(() => {
    let cancelled = false
    const loadEvalSettings = async () => {
      setEvalLoading(true)
      try {
        const [catalog, providers] = await Promise.all([getEvalProviderCatalog(), listEvalProviders()])
        if (cancelled) return
        setEvalCatalog(catalog)
        setConfiguredEvalProviders(providers)
        const configured = providers[0]
        const selectedName = configured?.provider_name ?? catalog[0]?.provider_name ?? 'openai'
        const catalogEntry = catalog.find((entry) => entry.provider_name === selectedName)
        setEvalProviderName(selectedName)
        setEvalModelName(configured?.model_name ?? catalogEntry?.default_model ?? 'gpt-4o-mini')
      } catch (err) {
        if (!cancelled) setEvalError(err instanceof Error ? err.message : 'Failed to load evaluation settings')
      } finally {
        if (!cancelled) setEvalLoading(false)
      }
    }
    void loadEvalSettings()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selectedEvalProvider || selectedEvalProvider.models.includes(evalModelName)) return
    setEvalModelName(selectedEvalProvider.default_model)
  }, [evalModelName, selectedEvalProvider])

  async function handleSaveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setResult('')
    setIsSavingProvider(true)
    try {
      const response = await connectProvider(apiKey, providerName)
      await loadConnections()
      setConnectionState((current) => ({ ...current, [response.id]: 'checked' }))
      setResult(`${providerDisplayName(response.provider_name)} connected and ${response.agent_count} agent${response.agent_count === 1 ? '' : 's'} imported.`)
      setApiKey('')
      setShowConnectForm(false)
      setManagedConnectionId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect provider')
    } finally {
      setIsSavingProvider(false)
    }
  }

  async function handleCheckConnection(connection: ProviderConnectionListItem) {
    setError('')
    setResult('')
    setIsRefreshingId(connection.id)
    try {
      const response = await testProviderConnection(connection.id)
      if (!response.ok) throw new Error(response.error ?? 'Connection check failed')
      setConnectionState((current) => ({ ...current, [connection.id]: 'checked' }))
      setResult(`${providerDisplayName(connection.provider_name)} is connected. ${response.agent_count ?? 0} agents found.`)
    } catch (err) {
      setConnectionState((current) => ({ ...current, [connection.id]: 'attention' }))
      setError(err instanceof Error ? err.message : 'Connection check failed')
    } finally {
      setIsRefreshingId('')
    }
  }

  async function handleRefreshAgents(connection: ProviderConnectionListItem) {
    setError('')
    setResult('')
    setIsRefreshingId(connection.id)
    try {
      const agents = await listAgents({ providerAccountId: connection.id, refresh: true })
      setAgentCountByAccount((current) => ({ ...current, [connection.id]: agents.length }))
      setConnectionState((current) => ({ ...current, [connection.id]: 'checked' }))
      setResult(`${providerDisplayName(connection.provider_name)} agent list refreshed. ${agents.length} agent${agents.length === 1 ? '' : 's'} available.`)
    } catch (err) {
      setConnectionState((current) => ({ ...current, [connection.id]: 'attention' }))
      setError(err instanceof Error ? err.message : 'Could not refresh agents')
    } finally {
      setIsRefreshingId('')
    }
  }

  async function handleSaveEvalProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEvalError('')
    setEvalResult('')
    setEvalSaving(true)
    try {
      const response = await connectEvalProvider(evalApiKey, evalProviderName, evalModelName)
      setConfiguredEvalProviders(await listEvalProviders())
      setEvalApiKey('')
      setEvalModelName(response.model_name)
      setShowEvalForm(false)
      setEvalResult(`${providerDisplayName(response.provider_name)} saved as the evaluation provider.`)
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Failed to save evaluation provider')
    } finally {
      setEvalSaving(false)
    }
  }

  return (
    <section className="page provider-page integration-page">
      <header className="integration-header">
        <h1>Integrations</h1>
        <p className="muted">Connect the platforms VaaniEval uses to import conversations and evaluate them.</p>
      </header>

      <section className="integration-section" aria-labelledby="voice-platforms-heading">
        <div className="integration-section-header">
          <div>
            <h2 id="voice-platforms-heading">Voice platforms</h2>
            <p className="muted">Import agents and conversations from your voice platform.</p>
          </div>
          <button type="button" className="provider-primary-btn" onClick={() => { setManagedConnectionId(''); setProviderName('elevenlabs'); setApiKey(''); setShowConnectForm(true) }}>
            <FontAwesomeIcon icon="plus" /> Connect platform
          </button>
        </div>

        <div className="integration-list">
          {providerConnections.length === 0 ? (
            <div className="integration-empty-state">
              <strong>No voice platforms connected</strong>
              <span>Connect Vapi, ElevenLabs, or Bolna to start importing conversations.</span>
            </div>
          ) : providerConnections.map((connection) => {
            const state = connectionState[connection.id]
            return (
              <article key={connection.id} className="integration-card">
                <div className="integration-card-main">
                  <div className="provider-logo-mark" aria-hidden="true">{connection.provider_name.slice(0, 1).toUpperCase()}</div>
                  <div>
                    <div className="integration-title-row">
                      <h3>{providerDisplayName(connection.provider_name)}</h3>
                      {state === 'checked' ? <StatusPill icon="check-circle" label="Connected" tone="success" /> : state === 'attention' ? <StatusPill icon="triangle-exclamation" label="Needs attention" tone="warning" /> : <StatusPill icon="clock" label="Connection saved" tone="neutral" />}
                    </div>
                    <p className="integration-meta">{agentCountByAccount[connection.id] ?? 0} imported agents · Connected {formatDateTime(connection.created_at)}</p>
                  </div>
                </div>
                <div className="integration-card-actions">
                  <button type="button" className="secondary" onClick={() => { setManagedConnectionId(connection.id); setProviderName(connection.provider_name); setApiKey(''); setShowConnectForm(true) }}>Manage</button>
                  <button type="button" className="secondary" onClick={() => handleCheckConnection(connection)} disabled={isRefreshingId === connection.id}>{isRefreshingId === connection.id ? 'Checking…' : 'Check connection'}</button>
                  <button type="button" className="secondary" onClick={() => handleRefreshAgents(connection)} disabled={isRefreshingId === connection.id}>Refresh agents</button>
                </div>
              </article>
            )
          })}
        </div>

        {showConnectForm && (
          <form className="integration-form" onSubmit={handleSaveProvider}>
            <div className="integration-form-header">
              <div>
                <h3>{managedConnection ? `Manage ${providerDisplayName(managedConnection.provider_name)}` : 'Connect a voice platform'}</h3>
                <p className="muted">{managedConnection ? 'Replace the API key to update this connection. We will verify it before saving.' : 'Enter an API key. We will verify it and import available agents before saving.'}</p>
              </div>
              <button type="button" className="button-link" onClick={() => { setShowConnectForm(false); setManagedConnectionId(''); setApiKey('') }}>Cancel</button>
            </div>
            {!managedConnection && <div className="provider-choice-row">
              {['elevenlabs', 'vapi', 'bolna'].map((name) => <button key={name} type="button" className={providerName === name ? 'provider-choice active' : 'provider-choice'} onClick={() => setProviderName(name)}>{providerDisplayName(name)}</button>)}
            </div>}
            <label htmlFor="apiKey">{managedConnection ? 'New API key' : `${providerDisplayName(providerName)} API key`}</label>
            <input id="apiKey" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} required placeholder="Paste API key" autoComplete="off" />
            <button type="submit" className="provider-primary-btn" disabled={isSavingProvider || !apiKey}>{isSavingProvider ? 'Verifying…' : managedConnection ? 'Verify & save key' : 'Connect & import agents'}</button>
          </form>
        )}
        {result && <p className="note" role="status">{result}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="integration-section" aria-labelledby="evaluation-provider-heading">
        <div className="integration-section-header">
          <div>
            <h2 id="evaluation-provider-heading">Evaluation model</h2>
            <p className="muted">Used to score conversations and generate insights.</p>
          </div>
        </div>
        <article className="integration-card evaluation-integration-card">
          <div className="integration-card-main">
            <div className="provider-logo-mark evaluation-mark" aria-hidden="true"><FontAwesomeIcon icon="brain" /></div>
            <div>
              <div className="integration-title-row"><h3>{evalCatalog.find((entry) => entry.provider_name === configuredEvalProvider?.provider_name)?.display_name ?? 'Not configured'}</h3>{configuredEvalProvider?.api_key_configured ? <StatusPill icon="check-circle" label="API key configured" tone="success" /> : <StatusPill icon="clock" label="Not configured" tone="neutral" />}</div>
              <p className="integration-meta">{configuredEvalProvider ? `Model: ${configuredEvalProvider.model_name}` : 'Choose a provider, model, and API key.'}</p>
            </div>
          </div>
          <button type="button" className="secondary" onClick={() => setShowEvalForm((value) => !value)}>{showEvalForm ? 'Close' : configuredEvalProvider ? 'Manage' : 'Configure'}</button>
        </article>
        {showEvalForm && <form onSubmit={handleSaveEvalProvider} className="integration-form">
          <h3>Configure evaluation model</h3>
          <label htmlFor="eval-provider-name">Provider</label>
          <select id="eval-provider-name" value={evalProviderName} onChange={(event) => setEvalProviderName(event.target.value)} disabled={evalLoading || evalSaving}>{evalCatalog.map((entry) => <option key={entry.provider_name} value={entry.provider_name}>{entry.display_name}</option>)}</select>
          <label htmlFor="eval-model-name">Model</label>
          <select id="eval-model-name" value={evalModelName} onChange={(event) => setEvalModelName(event.target.value)} disabled={evalLoading || evalSaving || !selectedEvalProvider}>{(selectedEvalProvider?.models ?? []).map((model) => <option key={model} value={model}>{model}</option>)}</select>
          <label htmlFor="eval-api-key">API key</label>
          <input id="eval-api-key" type="password" value={evalApiKey} onChange={(event) => setEvalApiKey(event.target.value)} required placeholder="Paste API key" autoComplete="off" />
          <button type="submit" className="provider-primary-btn" disabled={evalSaving || !evalApiKey || !evalModelName}>{evalSaving ? 'Saving…' : 'Save evaluation model'}</button>
        </form>}
        {evalResult && <p className="note" role="status">{evalResult}</p>}
        {evalError && <p className="error" role="alert">{evalError}</p>}
      </section>
    </section>
  )
}
