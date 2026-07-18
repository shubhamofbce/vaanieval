import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createImport, getImportProgress, listAgents, setDefaultAgent } from '../api/endpoints'
import type { ProviderAgentResponse } from '../api/types'
import { EmptyState } from '../components/EmptyState'
import { StatusPill } from '../components/StatusPill'

const IMPORT_DAYS_OPTIONS = [7, 30, 60]

function formatProviderName(providerName: string) {
  return providerName === 'elevenlabs' ? 'ElevenLabs' : providerName === 'vapi' ? 'Vapi' : providerName
}

type AgentImportState = {
  status: 'idle' | 'starting' | 'queued' | 'running' | 'completed' | 'failed'
  jobId?: string
  message?: string
}

export function AgentsPage() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<ProviderAgentResponse[]>([])
  const [providerFilter, setProviderFilter] = useState('all')
  const [nameFilter, setNameFilter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null)
  const [importDaysByAgentId, setImportDaysByAgentId] = useState<Record<string, number>>({})
  const [importStateByAgentId, setImportStateByAgentId] = useState<Record<string, AgentImportState>>({})
  const importTimersRef = useRef<Record<string, number>>({})

  const providerOptions = useMemo(() => {
    return Array.from(new Set(agents.map((agent) => agent.provider_name))).sort()
  }, [agents])

  const filteredAgents = useMemo(() => {
    const normalizedNameFilter = nameFilter.trim().toLowerCase()
    return agents.filter((agent) => {
      if (providerFilter !== 'all' && agent.provider_name !== providerFilter) {
        return false
      }
      if (normalizedNameFilter && !agent.name.toLowerCase().includes(normalizedNameFilter)) {
        return false
      }
      return true
    })
  }, [agents, nameFilter, providerFilter])

  async function handleLoad(refresh: boolean) {
    setError('')
    setLoading(true)
    try {
      const data = await listAgents({ refresh })
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
        const cached = await listAgents({ refresh: false })
        if (cancelled) {
          return
        }
        setAgents(cached)
        if (cached.length === 0) {
          const refreshed = await listAgents({ refresh: true })
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
  }, [])

  async function handleSetDefault(agentId: string) {
    setError('')
    try {
      await setDefaultAgent(agentId)
      await handleLoad(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default agent')
    }
  }

  function clearImportTimer(agentId: string) {
    const timerId = importTimersRef.current[agentId]
    if (timerId) {
      window.clearTimeout(timerId)
      delete importTimersRef.current[agentId]
    }
  }

  function scheduleImportPoll(agentId: string, jobId: string) {
    clearImportTimer(agentId)

    const poll = async () => {
      const progress = await getImportProgress(jobId).catch(() => null)
      if (!progress) {
        setImportStateByAgentId((current) => ({
          ...current,
          [agentId]: { status: 'failed', jobId, message: 'Failed to load import progress' },
        }))
        clearImportTimer(agentId)
        return
      }

      const nextStatus = progress.status === 'queued' || progress.status === 'running' ? progress.status : progress.status
      setImportStateByAgentId((current) => ({
        ...current,
        [agentId]: {
          status: nextStatus as AgentImportState['status'],
          jobId,
          message:
            nextStatus === 'completed'
              ? `Imported ${progress.imported_count} conversations.`
              : nextStatus === 'failed'
                ? `Import failed after ${progress.failed_count} errors.`
                : undefined,
        },
      }))

      if (progress.status === 'queued' || progress.status === 'running') {
        importTimersRef.current[agentId] = window.setTimeout(() => {
          void poll()
        }, 3000)
      } else {
        clearImportTimer(agentId)
      }
    }

    void poll()
  }

  async function handleImportConversations(agent: ProviderAgentResponse) {
    const days = importDaysByAgentId[agent.id] ?? 7
    const now = new Date()
    const endDate = now.toISOString().slice(0, 10)
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days)

    setError('')
    setImportStateByAgentId((current) => ({
      ...current,
      [agent.id]: { status: 'starting' },
    }))

    try {
      const created = await createImport({
        provider_account_id: agent.provider_account_id,
        agent_id: agent.provider_agent_id,
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate,
      })

      setImportStateByAgentId((current) => ({
        ...current,
        [agent.id]: { status: 'queued', jobId: created.id },
      }))
      scheduleImportPoll(agent.id, created.id)
    } catch (err) {
      setImportStateByAgentId((current) => ({
        ...current,
        [agent.id]: { status: 'failed', message: err instanceof Error ? err.message : 'Failed to create import job' },
      }))
      setError(err instanceof Error ? err.message : 'Failed to create import job')
    }
  }

  useEffect(() => {
    return () => {
      Object.values(importTimersRef.current).forEach((timerId) => window.clearTimeout(timerId))
      importTimersRef.current = {}
    }
  }, [])

  return (
    <section className="page agents-page">
      <div className="agents-control-row">
        <div className="workspace-compact-heading">
          <h1>Agents</h1>
          <p className="muted">Manage defaults, imports, and review queues without leaving the page.</p>
        </div>
        <div className="agents-control-actions">
          <button type="button" onClick={() => handleLoad(true)} disabled={loading}>
            <span className="control-with-icon">
              <FontAwesomeIcon icon="arrow-rotate-right" />
              <span>Sync agents from provider</span>
            </span>
          </button>
          <button type="button" className="secondary" onClick={() => handleLoad(false)} disabled={loading}>
            <span className="control-with-icon">
              <FontAwesomeIcon icon="clock" />
              <span>Load cached agents</span>
            </span>
          </button>
        </div>

        <div className="agents-toolbar agents-toolbar-compact">
          <div className="agents-filter-field">
            <label htmlFor="agent-provider-filter">Provider</label>
            <select
              id="agent-provider-filter"
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
            >
              <option value="all">All providers</option>
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          <div className="agents-filter-field agents-filter-field-wide">
            <label htmlFor="agent-name-filter">Agent name</label>
            <input
              id="agent-name-filter"
              type="text"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              placeholder="Filter by agent name"
            />
          </div>
        </div>
      </div>

      {loading && <p className="muted">Loading agents...</p>}
      {error && <p className="error">{error}</p>}

      <div className="panel agents-list-panel">
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
        ) : filteredAgents.length === 0 ? (
          <EmptyState
            icon="filter"
            title="No agents match these filters"
            message="Adjust the provider or name filters to broaden the result set."
          />
        ) : (
          <>
            <div className="agents-summary-band">
              <span>
                <strong>{agents.length}</strong> agents
              </span>
              <span>
                <strong>{providerOptions.length}</strong> connected {providerOptions.length === 1 ? 'provider' : 'providers'}
              </span>
              <span>
                <strong>{filteredAgents.length}</strong> shown
              </span>
            </div>

            <div className="agents-table" role="table" aria-label="Agents">
              <div className="agents-table-row agents-table-row-head" role="row">
                <span role="columnheader">Agent</span>
                <span role="columnheader">Provider</span>
                <span role="columnheader">Default</span>
                <span role="columnheader">Actions</span>
              </div>
              {filteredAgents.map((agent) => {
                const importing =
                  importStateByAgentId[agent.id]?.status === 'starting' ||
                  importStateByAgentId[agent.id]?.status === 'queued' ||
                  importStateByAgentId[agent.id]?.status === 'running'
                const isExpanded = expandedAgentId === agent.id
                return (
                  <div key={agent.id} className="agents-table-group">
                    <div className="agents-table-row" role="row">
                      <span className="agents-table-agent-cell" role="cell">
                        <span className="agent-avatar agent-avatar-compact">
                          <FontAwesomeIcon icon="robot" />
                        </span>
                        <span>
                          <strong>{agent.name}</strong>
                        </span>
                      </span>
                      <span role="cell">{formatProviderName(agent.provider_name)}</span>
                      <span role="cell">
                        {agent.is_default ? <StatusPill icon="check-circle" label="Default" tone="success" /> : <span className="muted">-</span>}
                      </span>
                      <span className="agents-table-actions" role="cell">
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
                          className="secondary agents-table-menu-toggle"
                          title="More actions"
                          onClick={() => setExpandedAgentId(isExpanded ? null : agent.id)}
                          aria-expanded={isExpanded}
                        >
                          <FontAwesomeIcon icon="ellipsis-vertical" />
                        </button>
                      </span>
                    </div>

                    {isExpanded ? (
                      <div className="agents-row-detail">
                        <div className="agents-row-detail-actions">
                          <button
                            type="button"
                            className="secondary"
                            disabled={agent.is_default}
                            onClick={() => handleSetDefault(agent.id)}
                          >
                            <span className="control-with-icon">
                              <FontAwesomeIcon icon="check-circle" />
                              <span>{agent.is_default ? 'Already default' : 'Make default'}</span>
                            </span>
                          </button>
                        </div>

                        <div className="agents-import-inline">
                          <label className="sr-only" htmlFor={`import-days-${agent.id}`}>
                            Import range for {agent.name}
                          </label>
                          <select
                            id={`import-days-${agent.id}`}
                            value={importDaysByAgentId[agent.id] ?? 7}
                            onChange={(event) =>
                              setImportDaysByAgentId((current) => ({
                                ...current,
                                [agent.id]: Number(event.target.value),
                              }))
                            }
                            disabled={loading || importing}
                          >
                            {IMPORT_DAYS_OPTIONS.map((days) => (
                              <option key={days} value={days}>
                                Last {days} days
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => void handleImportConversations(agent)}
                            disabled={loading || importing}
                          >
                            <span className="control-with-icon">
                              <FontAwesomeIcon icon={importing ? 'spinner' : 'file-import'} spin={importing} />
                              <span>{importing ? 'Importing conversations...' : 'Import conversations'}</span>
                            </span>
                          </button>
                        </div>
                        {importStateByAgentId[agent.id]?.message ? (
                          <p className="muted agent-import-status">{importStateByAgentId[agent.id]?.message}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
