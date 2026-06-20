import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import {
  connectEvalProvider,
  connectProvider,
  getEvalProviderCatalog,
  listEvalProviders,
  testProviderConnection,
} from '../api/endpoints'
import type { EvalProviderCatalogResponse, EvalProviderResponse } from '../api/types'

const PROVIDER_ACCOUNT_STORAGE_KEY = 've_provider_account_id'

export function ProviderPage() {
  const [apiKey, setApiKey] = useState('')
  const [accountId, setAccountId] = useState(localStorage.getItem(PROVIDER_ACCOUNT_STORAGE_KEY) ?? '')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [evalCatalog, setEvalCatalog] = useState<EvalProviderCatalogResponse[]>([])
  const [configuredEvalProviders, setConfiguredEvalProviders] = useState<EvalProviderResponse[]>([])
  const [evalProviderName, setEvalProviderName] = useState('openai')
  const [evalModelName, setEvalModelName] = useState('gpt-4o-mini')
  const [evalApiKey, setEvalApiKey] = useState('')
  const [evalResult, setEvalResult] = useState('')
  const [evalError, setEvalError] = useState('')
  const [evalSaving, setEvalSaving] = useState(false)
  const [evalLoading, setEvalLoading] = useState(true)

  const selectedEvalProvider = useMemo(
    () => evalCatalog.find((entry) => entry.provider_name === evalProviderName) ?? null,
    [evalCatalog, evalProviderName],
  )

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
        const preferredProvider = openAiConfig?.provider_name ?? catalog[0]?.provider_name ?? 'openai'
        const preferredCatalogEntry = catalog.find((entry) => entry.provider_name === preferredProvider)

        setEvalProviderName(preferredProvider)
        setEvalModelName(openAiConfig?.model_name ?? preferredCatalogEntry?.default_model ?? 'gpt-4o-mini')
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
    if (!selectedEvalProvider) {
      return
    }

    if (selectedEvalProvider.models.includes(evalModelName)) {
      return
    }

    const configuredProvider = configuredEvalProviders.find((provider) => provider.provider_name === evalProviderName)
    setEvalModelName(configuredProvider?.model_name ?? selectedEvalProvider.default_model)
  }, [configuredEvalProviders, evalModelName, evalProviderName, selectedEvalProvider])

  async function handleConnect(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setResult('')
    try {
      const res = await connectProvider(apiKey)
      setAccountId(res.id)
      localStorage.setItem(PROVIDER_ACCOUNT_STORAGE_KEY, res.id)
      setResult('ElevenLabs connected successfully.')
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

  async function handleSaveEvalProvider(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEvalError('')
    setEvalResult('')
    setEvalSaving(true)

    try {
      const response = await connectEvalProvider(evalApiKey, evalProviderName, evalModelName)
      const providers = await listEvalProviders()
      setConfiguredEvalProviders(providers)
      setEvalApiKey('')
      setEvalModelName(response.model_name)
      setEvalResult(
        `Saved ${response.provider_name} with default model ${response.model_name}. Credentials are encrypted at rest.`,
      )
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Failed to save evaluation provider')
    } finally {
      setEvalSaving(false)
    }
  }

  return (
    <section className="page provider-page">
      <PageHeader
        icon="plug"
        title="Provider Connections"
        subtitle="Connect once, sync agent metadata, and power every evaluation workflow automatically."
        className="provider-hero"
      />

      <div className="provider-grid">
        <article className="panel provider-card provider-card-primary">
          <div className="provider-card-header">
            <div className="provider-brand">
              <span className="provider-icon elevenlabs-icon">
                <FontAwesomeIcon icon={['fab', 'soundcloud']} />
              </span>
              <div>
                <h2>ElevenLabs</h2>
                <p className="muted">Production ready</p>
              </div>
            </div>
            {accountId ? (
              <StatusPill icon="check-circle" label="Connected" tone="success" />
            ) : (
              <StatusPill icon="clock" label="Not connected" tone="neutral" />
            )}
          </div>

          <div className="agent-capabilities">
            <span className="chip">
              <FontAwesomeIcon icon="shield" />
              <span>Secure API auth</span>
            </span>
            <span className="chip">
              <FontAwesomeIcon icon="users" />
              <span>Agent sync</span>
            </span>
            <span className="chip">
              <FontAwesomeIcon icon="wave-square" />
              <span>Conversation metadata</span>
            </span>
          </div>

          <form onSubmit={handleConnect}>
            <label htmlFor="apiKey">ElevenLabs API key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              required
              placeholder="Paste your ElevenLabs key"
            />
            <div className="inline">
              <button type="submit" className="control-with-icon">
                <FontAwesomeIcon icon="link" />
                <span>Connect ElevenLabs</span>
              </button>
              <button type="button" className="secondary" onClick={handleTest}>
                <span className="control-with-icon">
                  <FontAwesomeIcon icon="shield" />
                  <span>Check connection</span>
                </span>
              </button>
            </div>
          </form>

          {accountId && <p className="muted">Your workspace is connected and ready for agent sync.</p>}
          {result && <p className="note">{result}</p>}
          {error && <p className="error">{error}</p>}
        </article>

        <article className="panel provider-card provider-card-upcoming">
          <div className="provider-card-header">
            <div className="provider-brand">
              <span className="provider-icon">
                <FontAwesomeIcon icon="brain" />
              </span>
              <div>
                <h2>Evaluation Models</h2>
                <p className="muted">Configure multiple LLM providers, save a default model, and reuse them across evaluation reruns.</p>
              </div>
            </div>
            {configuredEvalProviders.length > 0 ? (
              <StatusPill icon="check-circle" label={`${configuredEvalProviders.length} configured`} tone="success" />
            ) : (
              <StatusPill icon="clock" label="Not configured" tone="neutral" />
            )}
          </div>

          <div className="agent-capabilities">
            <span className="chip">
              <FontAwesomeIcon icon="lock" />
              <span>Encrypted storage</span>
            </span>
            <span className="chip">
              <FontAwesomeIcon icon="shuffle" />
              <span>LangChain orchestration</span>
            </span>
            <span className="chip">
              <FontAwesomeIcon icon="table-cells-large" />
              <span>Model override per run</span>
            </span>
          </div>

          <form onSubmit={handleSaveEvalProvider}>
            <label htmlFor="eval-provider-name">Evaluation provider</label>
            <select
              id="eval-provider-name"
              value={evalProviderName}
              onChange={(event) => setEvalProviderName(event.target.value)}
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
              disabled={evalLoading || evalSaving || !selectedEvalProvider}
            >
              {(selectedEvalProvider?.models ?? []).map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

            <label htmlFor="eval-api-key">Provider API key</label>
            <input
              id="eval-api-key"
              type="password"
              value={evalApiKey}
              onChange={(event) => setEvalApiKey(event.target.value)}
              required
              placeholder={selectedEvalProvider ? `Paste your ${selectedEvalProvider.display_name} API key` : 'Paste your provider key'}
            />

            <p className="muted settings-note">
              Keys are encrypted before they are written to the database. The saved default model becomes the default selection in the evaluation modal, but you can still change it for any rerun.
            </p>

            <div className="inline">
              <button type="submit" className="control-with-icon" disabled={evalSaving || !evalApiKey || !evalModelName}>
                <FontAwesomeIcon icon="floppy-disk" />
                <span>{evalSaving ? 'Saving...' : 'Save evaluation provider'}</span>
              </button>
            </div>
          </form>

          {evalResult && <p className="note">{evalResult}</p>}
          {evalError && <p className="error">{evalError}</p>}

          <div className="provider-config-list">
            <h3>Configured evaluation providers</h3>
            {configuredEvalProviders.length === 0 ? (
              <p className="muted">No evaluation providers configured yet.</p>
            ) : (
              configuredEvalProviders.map((provider) => (
                <article key={provider.id}>
                  <div>
                    <strong>{provider.provider_name}</strong>
                    <p className="muted">Default model: {provider.model_name}</p>
                  </div>
                  <div className="provider-config-badges">
                    <span className="upcoming-pill">
                      <FontAwesomeIcon icon="key" />
                      <span>{provider.api_key_configured ? 'API key saved' : 'No key saved'}</span>
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
