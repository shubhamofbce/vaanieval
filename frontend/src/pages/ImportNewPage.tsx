import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createImport, listAgents } from '../api/endpoints'
import type { ProviderAgentResponse } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { usePersistedState } from '../lib/persistence'

function formatProviderName(providerName: string) {
  return providerName === 'elevenlabs'
    ? 'ElevenLabs'
    : providerName === 'vapi'
      ? 'Vapi'
      : providerName === 'bolna'
        ? 'Bolna'
        : providerName
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getLastNDaysRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  return { start: toDateInputValue(start), end: toDateInputValue(end) }
}

const IMPORT_QUICK_RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

export function ImportNewPage() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<ProviderAgentResponse[]>([])
  const [providerName, setProviderName] = usePersistedState('import:provider', '')
  const [agentId, setAgentId] = usePersistedState('import:agent', '')
  const defaultRange = useMemo(() => getLastNDaysRange(7), [])
  const [startDate, setStartDate] = usePersistedState('import:start-date', defaultRange.start)
  const [endDate, setEndDate] = usePersistedState('import:end-date', defaultRange.end)
  const [pageSize, setPageSize] = usePersistedState('import:page-size', 50)
  const [error, setError] = useState('')
  const [loadingAgents, setLoadingAgents] = useState(true)

  const providerOptions = useMemo(() => {
    const options = new Map<string, string>()
    for (const agent of agents) {
      if (!options.has(agent.provider_name)) {
        options.set(agent.provider_name, agent.provider_account_id)
      }
    }
    return Array.from(options.entries()).map(([name, accountId]) => ({
      name,
      accountId,
      importSupported: true,
    }))
  }, [agents])

  const selectedProvider = useMemo(
    () => providerOptions.find((option) => option.name === providerName) ?? null,
    [providerName, providerOptions],
  )

  const agentOptions = useMemo(() => {
    return agents
      .filter((agent) => agent.provider_name === providerName)
      .sort((left, right) => {
        if (Number(right.is_default) !== Number(left.is_default)) {
          return Number(right.is_default) - Number(left.is_default)
        }
        return left.name.localeCompare(right.name)
      })
  }, [agents, providerName])

  useEffect(() => {
    let cancelled = false

    const loadAgents = async () => {
      setLoadingAgents(true)
      setError('')
      try {
        const data = await listAgents({ refresh: false })
        if (cancelled) {
          return
        }
        setAgents(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load provider agents')
        }
      } finally {
        if (!cancelled) {
          setLoadingAgents(false)
        }
      }
    }

    void loadAgents()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (providerOptions.length === 0) {
      if (providerName) {
        setProviderName('')
      }
      return
    }

    if (providerName && providerOptions.some((option) => option.name === providerName)) {
      return
    }

    const preferredProvider = providerOptions.find((option) => option.importSupported) ?? providerOptions[0]
    setProviderName(preferredProvider.name)
  }, [providerName, providerOptions])

  useEffect(() => {
    if (!agentOptions.some((agent) => agent.provider_agent_id === agentId)) {
      setAgentId('')
    }
  }, [agentId, agentOptions])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!selectedProvider) {
      setError('Choose a provider before starting an import.')
      return
    }

    if (startDate && endDate && startDate > endDate) {
      setError('End date must be on or after start date.')
      return
    }

    try {
      const created = await createImport({
        provider_account_id: selectedProvider.accountId,
        agent_id: agentId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page_size: pageSize,
      })
      navigate(`/imports/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create import job')
    }
  }

  async function handleQuickImportLast7Days() {
    setError('')

    if (!selectedProvider) {
      setError('Choose a provider before starting an import.')
      return
    }

    const range = getLastNDaysRange(7)
    setStartDate(range.start)
    setEndDate(range.end)

    try {
      const created = await createImport({
        provider_account_id: selectedProvider.accountId,
        agent_id: agentId || undefined,
        start_date: range.start,
        end_date: range.end,
        page_size: pageSize,
      })
      navigate(`/imports/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create import job')
    }
  }

  return (
    <section className="page">
      <PageHeader
        icon="file-import"
        title="Import Conversations"
        subtitle="Choose a provider, narrow by agent if needed, and pull a clean historical conversation batch."
      />
      <div className="panel">
        <form onSubmit={handleSubmit}>
          <div className="import-form-intro">
            <p className="muted">
              This import creates a background job for historical conversations. The provider and agent lists come from the agents already synced into your workspace.
            </p>
          </div>

          <div className="import-quick-action">
            <button
              type="button"
              className="secondary"
              onClick={handleQuickImportLast7Days}
              disabled={loadingAgents || !selectedProvider}
            >
              <span className="control-with-icon">
                <FontAwesomeIcon icon="bolt" />
                <span>Import last 7 days</span>
              </span>
            </button>
            <p className="muted">One click to pull the last 7 days for the selected provider and agent. Need a custom range? Adjust the dates below.</p>
          </div>

          <label htmlFor="providerName">Provider</label>
          <select
            id="providerName"
            value={providerName}
            onChange={(event) => setProviderName(event.target.value)}
            disabled={loadingAgents || providerOptions.length === 0}
            required
          >
            {providerOptions.length === 0 ? <option value="">No providers available</option> : null}
            {providerOptions.map((option) => (
              <option key={option.name} value={option.name}>
                {formatProviderName(option.name)}
              </option>
            ))}
          </select>

          <label htmlFor="agentId">Agent</label>
          <select
            id="agentId"
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            disabled={loadingAgents || !providerName}
          >
            <option value="">All agents for this provider</option>
            {agentOptions.map((agent) => (
              <option key={agent.id} value={agent.provider_agent_id}>
                {agent.name}{agent.is_default ? ' · Default' : ''}
              </option>
            ))}
          </select>

          <label htmlFor="startDate">Start date (optional)</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />

          <label htmlFor="endDate">End date (optional)</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />

          <div className="import-quick-range-row">
            {IMPORT_QUICK_RANGES.map((option) => (
              <button
                key={option.days}
                type="button"
                className="chip-button"
                onClick={() => {
                  const range = getLastNDaysRange(option.days)
                  setStartDate(range.start)
                  setEndDate(range.end)
                }}
              >
                Last {option.label}
              </button>
            ))}
          </div>

          <label htmlFor="pageSize">Maximum calls to import</label>
          <input
            id="pageSize"
            type="number"
            min={1}
            max={200}
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
          />
          <p className="muted import-helper-text">Smaller batches finish faster.</p>

          {selectedProvider ? (
            <p className="import-preview-line">
              This will import <strong>{formatProviderName(selectedProvider.name)}</strong> ·{' '}
              <strong>{agentId ? (agentOptions.find((agent) => agent.provider_agent_id === agentId)?.name ?? 'selected agent') : 'all agents'}</strong> ·{' '}
              <strong>{startDate || 'any start date'} to {endDate || 'any end date'}</strong>
            </p>
          ) : null}

          <button type="submit" className="import-submit-button" disabled={loadingAgents || !selectedProvider}>
            <span className="control-with-icon">
              <FontAwesomeIcon icon="play" />
              <span>Start conversation import</span>
            </span>
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  )
}
