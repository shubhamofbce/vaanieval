import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createImport } from '../api/endpoints'
import { PageHeader } from '../components/PageHeader'

const PROVIDER_ACCOUNT_STORAGE_KEY = 've_provider_account_id'

export function ImportNewPage() {
  const navigate = useNavigate()
  const [providerAccountId, setProviderAccountId] = useState(
    localStorage.getItem(PROVIDER_ACCOUNT_STORAGE_KEY) ?? '',
  )
  const [agentId, setAgentId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pageSize, setPageSize] = useState(50)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    try {
      localStorage.setItem(PROVIDER_ACCOUNT_STORAGE_KEY, providerAccountId)
      const created = await createImport({
        provider_account_id: providerAccountId,
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

  return (
    <section className="page">
      <PageHeader
        icon="file-import"
        title="New Historical Import"
        subtitle="Pull calls by date range or agent and start a monitored ingestion run."
      />
      <div className="panel">
        <form onSubmit={handleSubmit}>
          <label htmlFor="providerAccountId">Provider account id</label>
          <input
            id="providerAccountId"
            value={providerAccountId}
            onChange={(event) => setProviderAccountId(event.target.value)}
            required
          />

          <label htmlFor="agentId">Agent id (optional)</label>
          <input id="agentId" value={agentId} onChange={(event) => setAgentId(event.target.value)} />

          <label htmlFor="startDate">Start date (optional)</label>
          <input
            id="startDate"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            placeholder="2026-01-01"
          />

          <label htmlFor="endDate">End date (optional)</label>
          <input
            id="endDate"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            placeholder="2026-06-19"
          />

          <label htmlFor="pageSize">Page size</label>
          <input
            id="pageSize"
            type="number"
            min={1}
            max={200}
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
          />

          <button type="submit">
            <span className="control-with-icon">
              <FontAwesomeIcon icon="play" />
              <span>Start import</span>
            </span>
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  )
}
