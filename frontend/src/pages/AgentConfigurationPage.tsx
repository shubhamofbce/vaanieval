import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getAgent, getAgentConfigVersion, listAgentConfigVersions } from '../api/endpoints'
import type { AgentConfigVersionDetail, AgentConfigVersionListItem, ProviderAgentResponse } from '../api/types'

function formatTime(value: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatField(path: string) {
  return path
    .split('.')
    .map((part) => part.replace(/([a-z])([A-Z])/g, '$1 $2'))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' › ')
}

function valueText(value: unknown) {
  if (value === null || value === undefined) return 'Not set'
  if (typeof value === 'string') return value
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  return JSON.stringify(value, null, 2)
}

function changeKind(change: AgentConfigVersionDetail['changes'][number]) {
  if (change.before === null || change.before === undefined) return 'Added'
  if (change.after === null || change.after === undefined) return 'Removed'
  return 'Updated'
}

export function AgentConfigurationPage() {
  const { agentId = '' } = useParams()
  const [agent, setAgent] = useState<ProviderAgentResponse | null>(null)
  const [versions, setVersions] = useState<AgentConfigVersionListItem[]>([])
  const [totalVersions, setTotalVersions] = useState(0)
  const [selectedVersion, setSelectedVersion] = useState<AgentConfigVersionDetail | null>(null)
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null)
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadingVersion, setLoadingVersion] = useState(false)
  const [error, setError] = useState('')

  async function selectVersion(versionNumber: number) {
    if (!agentId) return
    setSelectedVersionNumber(versionNumber)
    setLoadingVersion(true)
    setError('')
    try {
      setSelectedVersion(await getAgentConfigVersion(agentId, versionNumber))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration changes')
      setSelectedVersion(null)
    } finally {
      setLoadingVersion(false)
    }
  }

  async function loadMoreVersions() {
    if (!agentId) return
    try {
      const page = await listAgentConfigVersions(agentId, versions.length)
      setVersions((current) => [...current, ...page.items])
      setTotalVersions(page.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration history')
    }
  }

  useEffect(() => {
    if (!agentId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [loadedAgent, page] = await Promise.all([getAgent(agentId), listAgentConfigVersions(agentId, 0)])
        if (cancelled) return
        setAgent(loadedAgent)
        setVersions(page.items)
        setTotalVersions(page.total)
        const initial = page.items.find((item) => !item.is_baseline) ?? page.items[0]
        if (initial) void selectVersion(initial.version_number)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load agent configuration')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [agentId])

  const categories = useMemo(
    () => Array.from(new Set(selectedVersion?.changes.map((change) => change.category) ?? [])),
    [selectedVersion],
  )
  const changes = selectedVersion?.changes.filter((change) => category === 'all' || change.category === category) ?? []
  const canLoadMore = versions.length < totalVersions
  const isTracked = Boolean(agent?.configuration_version)
  const conversationsUrl = agent
    ? `/conversations?agentId=${encodeURIComponent(agent.provider_agent_id)}&agentName=${encodeURIComponent(agent.name)}`
    : '/conversations'

  return (
    <section className="page agent-configuration-page">
      <Link className="back-link" to="/settings/agents"><FontAwesomeIcon icon="arrow-left" /> Back to agents</Link>
      {loading ? <p className="muted">Loading configuration history...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {agent ? <>
        <header className="agent-configuration-header">
          <div>
            <div className="agent-configuration-eyebrow"><span className="agent-configuration-provider-badge">{agent.provider_name === 'vapi' ? 'Vapi' : agent.provider_name}</span>{isTracked ? <span>Version {agent.configuration_version}</span> : null}</div>
            <h1>{agent.name} configuration</h1>
            <p className="muted">Review tracked configuration changes before investigating conversation results.</p>
          </div>
          <Link className="agent-configuration-conversations-link" to={conversationsUrl}><FontAwesomeIcon icon="comments" /> View conversations</Link>
        </header>

        {!isTracked ? <div className="panel agent-configuration-empty"><FontAwesomeIcon icon="clock" /><div><h2>Configuration tracking has not started</h2><p>Run a Vapi agent sync to capture this agent’s baseline. Other providers are not tracked yet.</p></div></div> : <>
          <div className="agent-configuration-status" aria-label="Configuration tracking status">
            <div><span>Tracking since</span><strong>{formatTime(versions[versions.length - 1]?.captured_at)}</strong></div>
            <div><span>Last checked</span><strong>{formatTime(agent.configuration_checked_at)}</strong></div>
            <div><span>Latest change</span><strong>{agent.last_configuration_change_at ? formatTime(agent.last_configuration_change_at) : 'Baseline only'}</strong></div>
          </div>
          <div className="agent-configuration-workspace">
            <aside className="panel agent-version-timeline" aria-label="Configuration version history">
              <div className="agent-version-timeline-header"><h2>Version history</h2><span>{totalVersions} {totalVersions === 1 ? 'version' : 'versions'}</span></div>
              <div className="agent-version-list">
                {versions.map((version) => <button key={version.version_number} type="button" className={`agent-version-item ${selectedVersionNumber === version.version_number ? 'selected' : ''}`} onClick={() => void selectVersion(version.version_number)} aria-current={selectedVersionNumber === version.version_number ? 'true' : undefined}>
                  <span className="agent-version-marker" aria-hidden="true" />
                  <span><strong>{version.is_baseline ? 'Baseline' : `Version ${version.version_number}`}</strong><small>{formatTime(version.captured_at)}</small>{version.change_categories.length ? <span className="category-chip-row">{version.change_categories.map((item) => <em key={item}>{item}</em>)}</span> : null}</span>
                </button>)}
              </div>
              {canLoadMore ? <button type="button" className="secondary agent-load-more" onClick={() => void loadMoreVersions()}>Load older versions</button> : null}
            </aside>
            <section className="panel agent-change-review" aria-live="polite">
              {loadingVersion ? <p className="muted">Loading changes...</p> : selectedVersion ? selectedVersion.changes.length === 0 ? <div className="agent-configuration-empty"><FontAwesomeIcon icon="flag" /><div><h2>Baseline configuration</h2><p>This is the first captured configuration. Future versions will show what changed from this baseline.</p></div></div> : <>
                <div className="agent-change-review-header"><div><p className="eyebrow">Version {selectedVersion.version_number} compared with Version {selectedVersion.version_number - 1}</p><h2>{selectedVersion.changes.length} {selectedVersion.changes.length === 1 ? 'change' : 'changes'} detected</h2></div></div>
                <div className="agent-category-filters"><button type="button" className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>All</button>{categories.map((item) => <button key={item} type="button" className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
                <div className="agent-change-list">{changes.map((change, index) => <article key={`${change.path}-${index}`} className="agent-change-card"><div className="agent-change-card-heading"><span className={`agent-change-kind ${changeKind(change).toLowerCase()}`}>{changeKind(change)}</span><span className="category-chip">{change.category}</span></div><h3>{formatField(change.path)}</h3><div className="agent-change-values"><div><span>Before</span><pre>{valueText(change.before)}</pre></div><div><span>After</span><pre>{valueText(change.after)}</pre></div></div></article>)}</div>
                {changes.length === 0 ? <p className="muted">No changes match this category.</p> : null}
              </> : <p className="muted">Select a version to review its changes.</p>}
            </section>
          </div>
        </>}
      </> : null}
    </section>
  )
}
