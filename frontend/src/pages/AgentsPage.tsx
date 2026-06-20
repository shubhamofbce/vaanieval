import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { listAgents, setDefaultAgent } from '../api/endpoints'
import type { ProviderAgentResponse } from '../api/types'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'

const PROVIDER_ACCOUNT_STORAGE_KEY = 've_provider_account_id'

export function AgentsPage() {
  const navigate = useNavigate()
  const [accountId] = useState(localStorage.getItem(PROVIDER_ACCOUNT_STORAGE_KEY) ?? '')
  const [agents, setAgents] = useState<ProviderAgentResponse[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLoad(refresh: boolean) {
    setError('')
    setLoading(true)
    try {
      const data = await listAgents(accountId || undefined, refresh)
      setAgents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      setError('')
      setLoading(true)
      try {
        const cached = await listAgents(accountId || undefined, false)
        if (cancelled) {
          return
        }
        setAgents(cached)
        if (cached.length === 0) {
          const refreshed = await listAgents(accountId || undefined, true)
          if (!cancelled) {
            setAgents(refreshed)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load agents')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [accountId])

  async function handleSetDefault(agentId: string) {
    setError('')
    try {
      await setDefaultAgent(agentId)
      await handleLoad(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default agent')
    }
  }

  return (
    <section className="page agents-page">
      <PageHeader
        icon="users"
        title="Agents"
        subtitle="Pick an agent, set defaults, and jump into filtered conversation review instantly."
        className="provider-hero"
      />

      <div className="panel">
        <div className="inline">
          <button type="button" onClick={() => handleLoad(true)} disabled={loading}>
            <span className="control-with-icon">
              <FontAwesomeIcon icon="arrow-rotate-right" />
              <span>Sync agents from ElevenLabs</span>
            </span>
          </button>
          <button type="button" className="secondary" onClick={() => handleLoad(false)} disabled={loading}>
            <span className="control-with-icon">
              <FontAwesomeIcon icon="clock" />
              <span>Load cached agents</span>
            </span>
          </button>
        </div>

        {loading && <p className="muted">Loading agents...</p>}
        {!accountId && (
          <p className="muted">
            <FontAwesomeIcon icon="link" /> Using your connected workspace provider automatically.
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="panel">
        <h2>Your agents</h2>
        {agents.length === 0 ? (
          <EmptyState
            icon="headset"
            title="No agents loaded yet"
            message="Sync once to pull current providers and keep your local cache ready for future visits."
            action={
              <button type="button" onClick={() => handleLoad(true)} disabled={loading}>
                <span className="control-with-icon">
                  <FontAwesomeIcon icon="arrow-rotate-right" />
                  <span>Sync now</span>
                </span>
              </button>
            }
          />
        ) : (
          <div className="agents-grid">
            {agents.map((agent) => (
              <article key={agent.id} className="agent-card">
                <div className="agent-card-header">
                  <div>
                    <div className="agent-title-row">
                      <span className="agent-avatar">
                        <FontAwesomeIcon icon="robot" />
                      </span>
                      <h3>{agent.name}</h3>
                    </div>
                    <p className="muted">ElevenLabs voice assistant</p>
                  </div>

                  {agent.is_default ? <StatusPill icon="check-circle" label="Default" tone="success" /> : null}
                </div>

                <div className="agent-capabilities">
                  <span className="chip">
                    <FontAwesomeIcon icon="wave-square" />
                    <span>Voice workflow</span>
                  </span>
                  <span className="chip">
                    <FontAwesomeIcon icon="comments" />
                    <span>Conversation review</span>
                  </span>
                </div>

                <div className="inline">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/conversations?agentId=${encodeURIComponent(agent.provider_agent_id)}&agentName=${encodeURIComponent(agent.name)}`,
                      )
                    }
                  >
                    <span className="control-with-icon">
                      <FontAwesomeIcon icon="comments" />
                      <span>View conversations</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={agent.is_default}
                    onClick={() => handleSetDefault(agent.id)}
                  >
                    <span className="control-with-icon">
                      <FontAwesomeIcon icon="check-circle" />
                      <span>Make default</span>
                    </span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
