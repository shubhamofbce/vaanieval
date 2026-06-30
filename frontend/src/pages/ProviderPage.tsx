import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { StatusPill } from '../components/StatusPill'
import {
  connectEvalProvider,
  connectProvider,
  getEvalProviderCatalog,
  getEvalProviderModels,
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

const PROVIDER_ACCOUNT_STORAGE_KEY = 've_provider_account_id'
const PROVIDER_NAME_STORAGE_KEY = 've_provider_name'

export function ProviderPage() {
  const [apiKey, setApiKey] = useState('')
  const [accountId, setAccountId] = useState(localStorage.getItem(PROVIDER_ACCOUNT_STORAGE_KEY) ?? '')
  const [providerName, setProviderName] = useState(
    localStorage.getItem(PROVIDER_NAME_STORAGE_KEY) ?? 'elevenlabs',
  )
  const [providerConnections, setProviderConnections] = useState<ProviderConnectionListItem[]>([])
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [evalCatalog, setEvalCatalog] = useState<EvalProviderCatalogResponse[]>([])
  const [configuredEvalProviders, setConfiguredEvalProviders] = useState<EvalProviderResponse[]>([])
  const [evalProviderName, setEvalProviderName] = useState('openai')
  const [evalModelName, setEvalModelName] = useState('gpt-4o-mini')
  const [evalApiKey, setEvalApiKey] = useState('')
  const [showEvalForm, setShowEvalForm] = useState(false)
  const [isSyncingId, setIsSyncingId] = useState('')
  const [agentCountByAccount, setAgentCountByAccount] = useState<Record<string, number>>({})
  const [evalResult, setEvalResult] = useState('')
  const [evalError, setEvalError] = useState('')
  const [evalSaving, setEvalSaving] = useState(false)
  const [evalLoading, setEvalLoading] = useState(true)
  const [evalModels, setEvalModels] = useState<string[]>([])
  const [evalModelsLoading, setEvalModelsLoading] = useState(false)
  const [evalModelsError, setEvalModelsError] = useState('')
  const [evalModelsReloadKey, setEvalModelsReloadKey] = useState(0)

  const selectedEvalProvider = useMemo(
    () => evalCatalog.find((entry) => entry.provider_name === evalProviderName) ?? null,
    [evalCatalog, evalProviderName],
  )

  const selectedVoiceConnection = useMemo(
    () => providerConnections.find((connection) => connection.id === accountId) ?? null,
    [accountId, providerConnections],
  )

  const configuredEvalProvider = useMemo(
    () => configuredEvalProviders.find((provider) => provider.provider_name === evalProviderName) ?? configuredEvalProviders[0] ?? null,
    [configuredEvalProviders, evalProviderName],
  )

  const configuredEvalProviderCatalog = useMemo(
    () => evalCatalog.find((entry) => entry.provider_name === configuredEvalProvider?.provider_name) ?? null,
    [configuredEvalProvider, evalCatalog],
  )

  const configuredEvalProviderReady = Boolean(
    configuredEvalProvider
      && (!configuredEvalProviderCatalog?.requires_api_key || configuredEvalProvider.api_key_configured),
  )

  const readyProviderCount = providerConnections.length

  const connectedVoiceLabel = readyProviderCount === 1 ? 'Connected' : 'Connected'

  useEffect(() => {
    let cancelled = false

    const loadEvalSettings = async () => {
      setEvalLoading(true)
      setEvalError('')

      try {
        const [catalog, providers] = await Promise.all([getEvalProviderCatalog(), listEvalProviders()])
        if (cancelled) {
          return
        }

        setEvalCatalog(catalog)
        setConfiguredEvalProviders(providers)

        const openAiConfig = providers.find((provider) => provider.provider_name === 'openai')
        const preferredProvider = openAiConfig?.provider_name ?? providers[0]?.provider_name ?? catalog[0]?.provider_name ?? 'openai'
        const preferredCatalogEntry = catalog.find((entry) => entry.provider_name === preferredProvider)

        setEvalProviderName(preferredProvider)
        setEvalModelName(openAiConfig?.model_name ?? preferredCatalogEntry?.default_model ?? '')
      } catch (err) {
        if (!cancelled) {
          setEvalError(err instanceof Error ? err.message : 'Failed to load evaluation settings')
        }
      } finally {
        if (!cancelled) {
          setEvalLoading(false)
        }
      }
    }

    void loadEvalSettings()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadProviderConnections = async () => {
      try {
        const connections = await listProviderConnections()
        if (cancelled) {
          return
        }
        setProviderConnections(connections)

        if (!connections.some((connection) => connection.id === accountId)) {
          const fallback = connections[0]
          setAccountId(fallback?.id ?? '')
          if (fallback) {
            localStorage.setItem(PROVIDER_ACCOUNT_STORAGE_KEY, fallback.id)
            localStorage.setItem(PROVIDER_NAME_STORAGE_KEY, fallback.provider_name)
          } else {
            localStorage.removeItem(PROVIDER_ACCOUNT_STORAGE_KEY)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load provider connections')
        }
      }
    }

    void loadProviderConnections()

    return () => {
      cancelled = true
    }
  }, [accountId])

  useEffect(() => {
    let cancelled = false

    const loadAgentCounts = async () => {
      try {
        const agents = await listAgents({ refresh: false })
        if (cancelled) {
          return
        }

        const grouped = agents.reduce<Record<string, number>>((acc, agent) => {
          const key = agent.provider_account_id
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        }, {})
        setAgentCountByAccount(grouped)
      } catch {
        if (!cancelled) {
          setAgentCountByAccount({})
        }
      }
    }

    void loadAgentCounts()

    return () => {
      cancelled = true
    }
  }, [providerConnections.length])

  useEffect(() => {
    if (!selectedEvalProvider || !evalProviderName) {
      return
    }

    let cancelled = false
    const loadModels = async () => {
      setEvalModelsLoading(true)
      setEvalModelsError('')
      try {
        const response = await getEvalProviderModels(evalProviderName)
        if (cancelled) {
          return
        }
        setEvalModels(response.models)
        const configuredProvider = configuredEvalProviders.find((provider) => provider.provider_name === evalProviderName)
        const preferredModel = configuredProvider?.model_name && response.models.includes(configuredProvider.model_name)
          ? configuredProvider.model_name
          : selectedEvalProvider.default_model && response.models.includes(selectedEvalProvider.default_model)
            ? selectedEvalProvider.default_model
            : response.models[0] ?? ''
        setEvalModelName(preferredModel)
      } catch (err) {
        if (!cancelled) {
          setEvalModels([])
          setEvalModelName('')
          setEvalModelsError(err instanceof Error ? err.message : 'Failed to load evaluation models')
        }
      } finally {
        if (!cancelled) {
          setEvalModelsLoading(false)
        }
      }
    }

    void loadModels()
    return () => {
      cancelled = true
    }
  }, [configuredEvalProviders, evalModelsReloadKey, evalProviderName, selectedEvalProvider])

  async function handleConnect(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setResult('')
    try {
      const res = await connectProvider(apiKey, providerName)
      setAccountId(res.id)
      localStorage.setItem(PROVIDER_ACCOUNT_STORAGE_KEY, res.id)
      localStorage.setItem(PROVIDER_NAME_STORAGE_KEY, res.provider_name)
      const connections = await listProviderConnections()
      setProviderConnections(connections)
      setResult(`${res.provider_name} connected successfully.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect provider')
    }
  }

  async function handleTest() {
    if (!accountId) {
      setError('No provider account id found. Connect first.')
      return
    }
    setError('')
    setResult('')
    try {
      const res = await testProviderConnection(accountId)
      if (res.ok) {
        setResult(`Connection healthy. Agents found: ${res.agent_count ?? 0}`)
      } else {
        setError(res.error ?? 'Provider connection test failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
    }
  }

  async function handleConnectionSync(connectionId: string) {
    setError('')
    setResult('')
    setIsSyncingId(connectionId)

    try {
      const res = await testProviderConnection(connectionId)
      if (res.ok) {
        setResult(`Sync check complete. Agents detected: ${res.agent_count ?? 0}`)
      } else {
        setError(res.error ?? 'Sync check failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync check failed')
    } finally {
      setIsSyncingId('')
    }
  }

  async function handleSaveEvalProvider(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEvalError('')
    setEvalResult('')
    setEvalSaving(true)

    try {
      const response = await connectEvalProvider(
        selectedEvalProvider?.requires_api_key ? evalApiKey : null,
        evalProviderName,
        evalModelName,
      )
      const providers = await listEvalProviders()
      setConfiguredEvalProviders(providers)
      setEvalApiKey('')
      setEvalModelName(response.model_name)
      setEvalResult(`Saved ${response.provider_name} with default model ${response.model_name}.`)
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Failed to save evaluation provider')
    } finally {
      setEvalSaving(false)
    }
  }

  return (
    <section className="page provider-page revamped-provider-page">
      <section className="panel provider-top-hero">
        <div>
          <h1>Providers & Integrations</h1>
          <p className="muted">
            Connect your voice platforms and evaluation providers. We&apos;ll sync data and power your evaluation workflows.
          </p>
        </div>

        <div className="provider-flow-icons" aria-hidden="true">
          <span className="provider-flow-dot" />
          <span className="provider-flow-node">
            <FontAwesomeIcon icon="wave-square" />
          </span>
          <span className="provider-flow-node">
            <FontAwesomeIcon icon="plug" />
          </span>
          <span className="provider-flow-node success">
            <FontAwesomeIcon icon="chart-line" />
          </span>
          <span className="provider-flow-dot" />
        </div>
      </section>

      <section className="provider-summary-grid">
        <article className="panel provider-summary-card">
          <div className="provider-summary-head">
            <span className="provider-summary-icon">
              <FontAwesomeIcon icon="wave-square" />
            </span>
            <h2>Voice Platforms</h2>
          </div>
          <p className="muted">Connect voice platforms to import conversations</p>
          <div className="provider-summary-value">{readyProviderCount}</div>
          <small>{connectedVoiceLabel}</small>
        </article>

        <article className="panel provider-summary-card">
          <div className="provider-summary-head">
            <span className="provider-summary-icon evaluation">
              <FontAwesomeIcon icon="brain" />
            </span>
            <h2>Evaluation Provider</h2>
          </div>
          <p className="muted">Manage your evaluation models and API keys</p>
          <div className="provider-summary-value">{configuredEvalProviders.length}</div>
          <small>Configured</small>
        </article>
      </section>

      <div className="provider-grid provider-grid-revamped">
        <article className="panel provider-card provider-card-primary provider-voice-panel">
          <div className="provider-card-header">
            <div>
              <div>
                <h2>Connected Voice Platforms</h2>
                <p className="muted">Manage your voice platform connections and sync settings.</p>
              </div>
            </div>

            <button type="button" className="provider-primary-btn" onClick={() => setProviderName('elevenlabs')}>
              <FontAwesomeIcon icon="link" />
              <span>Connect Provider</span>
            </button>
          </div>

          <div className="provider-connection-list">
            {providerConnections.length === 0 ? (
              <p className="muted">No voice provider connections saved yet.</p>
            ) : (
              providerConnections.map((connection) => (
                <article key={connection.id} className="provider-connection-item">
                  <div className="provider-connection-head">
                    <div className="provider-logo-mark">{connection.provider_name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <strong>{connection.provider_name === 'elevenlabs' ? 'ElevenLabs' : 'Vapi'}</strong>
                      <div className="provider-connection-status-row">
                        <StatusPill icon="check-circle" label="Connected" tone="success" />
                      </div>
                    </div>
                  </div>

                  <div className="provider-connection-meta">
                    <span>
                      <FontAwesomeIcon icon="users" /> {agentCountByAccount[connection.id] ?? 0} agents imported
                    </span>
                    <span>
                      <FontAwesomeIcon icon="clock" /> Added {new Date(connection.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="provider-connection-actions">
                    <button type="button" className="secondary" onClick={() => handleConnectionSync(connection.id)} disabled={isSyncingId === connection.id}>
                      <FontAwesomeIcon icon="arrow-rotate-right" />
                      <span>{isSyncingId === connection.id ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setAccountId(connection.id)
                        setProviderName(connection.provider_name)
                        setResult('Connection selected for reconnection.')
                      }}
                    >
                      <FontAwesomeIcon icon="key" />
                      <span>Reconnect</span>
                    </button>
                    <button type="button" className="provider-danger-btn" disabled>
                      <FontAwesomeIcon icon="xmark-circle" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="provider-connect-new">
            <h3>Connect New Provider</h3>
            <p className="muted">Choose a voice platform to get started.</p>

            <div className="provider-choice-row">
              <button type="button" className={providerName === 'vapi' ? 'provider-choice active' : 'provider-choice'} onClick={() => setProviderName('vapi')}>
                <span>Vapi</span>
              </button>
              <button type="button" className={providerName === 'elevenlabs' ? 'provider-choice active' : 'provider-choice'} onClick={() => setProviderName('elevenlabs')}>
                <span>ElevenLabs</span>
              </button>
            </div>

            <form onSubmit={handleConnect} className="provider-inline-form">
              <label htmlFor="apiKey">{providerName === 'vapi' ? 'Vapi' : 'ElevenLabs'} API key</label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                required
                placeholder={`Paste your ${providerName === 'vapi' ? 'Vapi' : 'ElevenLabs'} key`}
              />
              <div className="inline">
                <button type="submit" className="provider-primary-btn">
                  <FontAwesomeIcon icon="link" />
                  <span>Connect</span>
                </button>
                <button type="button" className="secondary" onClick={handleTest} disabled={!selectedVoiceConnection}>
                  <FontAwesomeIcon icon="shield" />
                  <span>Test Connection</span>
                </button>
              </div>
            </form>
          </div>

          {result && <p className="note">{result}</p>}
          {error && <p className="error">{error}</p>}
        </article>

        <article className="panel provider-card provider-card-upcoming provider-evaluation-panel">
          <div className="provider-card-header">
            <div>
              <div>
                <h2>Evaluation Provider</h2>
                <p className="muted">Configure your default evaluation settings.</p>
              </div>
            </div>

            {configuredEvalProviderReady ? (
              <StatusPill icon="check-circle" label="Ready" tone="success" />
            ) : (
              <StatusPill icon="clock" label="Not configured" tone="neutral" />
            )}
          </div>

          <div className="provider-eval-card">
            <h3>{configuredEvalProvider?.provider_name ?? 'OpenAI'}</h3>
            <div className="provider-eval-meta">
              <span>Status</span>
              <StatusPill
                icon={configuredEvalProviderReady ? 'check-circle' : 'clock'}
                label={configuredEvalProviderReady ? 'Connected' : 'Not connected'}
                tone={configuredEvalProviderReady ? 'success' : 'neutral'}
              />
            </div>
            <p className="provider-eval-model">{configuredEvalProvider?.model_name ?? evalModelName}</p>

            <button type="button" className="secondary" onClick={() => setShowEvalForm((value) => !value)}>
              <FontAwesomeIcon icon="sliders" />
              <span>{showEvalForm ? 'Hide' : 'Manage'}</span>
            </button>
          </div>

          {showEvalForm ? (
            <form onSubmit={handleSaveEvalProvider} className="provider-eval-form">
              <label htmlFor="eval-provider-name">Evaluation provider</label>
              <select
                id="eval-provider-name"
                value={evalProviderName}
                onChange={(event) => {
                  setEvalProviderName(event.target.value)
                  setEvalApiKey('')
                }}
                disabled={evalLoading || evalSaving || evalCatalog.length === 0}
              >
                {evalCatalog.map((entry) => (
                  <option key={entry.provider_name} value={entry.provider_name}>
                    {entry.display_name}
                  </option>
                ))}
              </select>

              <label htmlFor="eval-model-name">Default evaluation model</label>
              <select
                id="eval-model-name"
                value={evalModelName}
                onChange={(event) => setEvalModelName(event.target.value)}
                disabled={evalLoading || evalSaving || evalModelsLoading || evalModels.length === 0}
              >
                {evalModelsLoading ? (
                  <option value="">Loading models...</option>
                ) : evalModels.length === 0 ? (
                  <option value="">No models available</option>
                ) : (
                  evalModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))
                )}
              </select>

              {evalModelsError ? (
                <div>
                  <p className="error">{evalModelsError}</p>
                  <button type="button" className="secondary" onClick={() => setEvalModelsReloadKey((value) => value + 1)}>
                    Retry model discovery
                  </button>
                </div>
              ) : evalProviderName === 'ollama' && !evalModelsLoading && evalModels.length === 0 ? (
                <p className="muted">No Ollama models are installed. Run <code>ollama pull &lt;model&gt;</code>, then retry.</p>
              ) : null}

              {selectedEvalProvider?.requires_api_key ? (
                <>
                  <label htmlFor="eval-api-key">Provider API key</label>
                  <input
                    id="eval-api-key"
                    type="password"
                    value={evalApiKey}
                    onChange={(event) => setEvalApiKey(event.target.value)}
                    required
                    placeholder={`Paste your ${selectedEvalProvider.display_name} API key`}
                  />
                </>
              ) : (
                <p className="muted">Ollama runs locally and does not require an API key.</p>
              )}

              <button
                type="submit"
                className="provider-primary-btn"
                disabled={evalSaving || evalModelsLoading || !evalModelName || Boolean(selectedEvalProvider?.requires_api_key && !evalApiKey)}
              >
                <FontAwesomeIcon icon="floppy-disk" />
                <span>{evalSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </form>
          ) : null}

          {evalResult && <p className="note">{evalResult}</p>}
          {evalError && <p className="error">{evalError}</p>}

          <div className="panel provider-eval-info">
            <h3>About Evaluation</h3>
            <p className="muted">
              Your evaluation provider is used to score conversations and generate insights. You can change the model or provider anytime.
            </p>
            <a href="/conversations">Learn more about evaluations</a>
          </div>
        </article>
      </div>
    </section>
  )
}
