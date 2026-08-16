import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cancelImport, getImportProgress } from '../api/endpoints'
import type { ImportProgressResponse } from '../api/types'
import { PageHeader } from '../components/PageHeader'

const IMPORT_PROGRESS_POLL_INTERVAL_MS = 3000

// Allow-list of the statuses an import job holds while it is still doing work, matching
// ImportJobStatus in the backend and the sibling pollers on ConversationsPage,
// ConversationDetailPage and RubricsPage. An allow-list fails safe: a status this page has
// never heard of stops the poller and leaves manual refresh, rather than polling forever.
const ACTIVE_IMPORT_STATUSES = ['queued', 'running', 'paused']

function isActiveImportStatus(status: string) {
  return ACTIVE_IMPORT_STATUSES.includes(status)
}

type ImportProgressState = {
  jobId: string
  progress: ImportProgressResponse | null
  pollError: string
  actionError: string
}

const EMPTY_IMPORT_PROGRESS_STATE: ImportProgressState = {
  jobId: '',
  progress: null,
  pollError: '',
  actionError: '',
}

export function ImportProgressPage() {
  const { importJobId = '' } = useParams()
  const [state, setState] = useState<ImportProgressState>(EMPTY_IMPORT_PROGRESS_STATE)
  // Bumped when the displayed job changes or the page unmounts, so a response belonging to
  // an abandoned job cannot write state or stop the poller that replaced it.
  const jobGenerationRef = useRef(0)
  // Response ordering: a request only wins if no newer request has already been applied.
  const requestSeqRef = useRef(0)
  const appliedSeqRef = useRef(0)

  const patchState = useCallback((jobId: string, patch: Partial<ImportProgressState>) => {
    setState((current) => ({
      ...(current.jobId === jobId ? current : EMPTY_IMPORT_PROGRESS_STATE),
      ...patch,
      jobId,
    }))
  }, [])

  const loadProgress = useCallback(async () => {
    if (!importJobId) {
      return
    }

    const jobId = importJobId
    const generation = jobGenerationRef.current
    const sequence = ++requestSeqRef.current
    const isStale = () =>
      generation !== jobGenerationRef.current || sequence <= appliedSeqRef.current

    try {
      const data = await getImportProgress(jobId)
      if (isStale()) {
        return
      }
      appliedSeqRef.current = sequence
      patchState(jobId, { progress: data, pollError: '' })
    } catch (err) {
      if (isStale()) {
        return
      }
      appliedSeqRef.current = sequence
      patchState(jobId, {
        pollError: err instanceof Error ? err.message : 'Failed to load import progress',
      })
    }
  }, [importJobId, patchState])

  const view = state.jobId === importJobId ? state : EMPTY_IMPORT_PROGRESS_STATE
  const progress = view.progress
  const isActive = progress !== null && isActiveImportStatus(progress.status)
  const hasProgress = progress !== null
  const status = progress?.status ?? ''

  // Start tracking a job: read it once immediately, and retire the generation on the way
  // out so responses still in flight for the old job are discarded.
  useEffect(() => {
    const startTracking = async () => {
      if (!importJobId) {
        return
      }
      await loadProgress()
    }

    void startTracking()

    return () => {
      jobGenerationRef.current += 1
    }
  }, [importJobId, loadProgress])

  useEffect(() => {
    if (!importJobId || (hasProgress && !isActiveImportStatus(status))) {
      return
    }

    const timer = window.setInterval(() => {
      void loadProgress()
    }, IMPORT_PROGRESS_POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [importJobId, hasProgress, status, loadProgress])

  async function handleCancel() {
    if (!importJobId || !isActive) {
      return
    }

    const jobId = importJobId
    const generation = jobGenerationRef.current
    try {
      await cancelImport(jobId)
      if (generation !== jobGenerationRef.current) {
        return
      }
      patchState(jobId, { actionError: '' })
      await loadProgress()
    } catch (err) {
      if (generation !== jobGenerationRef.current) {
        return
      }
      patchState(jobId, {
        actionError: err instanceof Error ? err.message : 'Failed to cancel import',
      })
    }
  }

  const refreshLabel = view.pollError ? 'Retry import progress' : 'Refresh import progress'

  return (
    <section className="page">
      <PageHeader
        icon="clock"
        title="Import Progress"
        subtitle="Track queue health and imported records in real time."
      />
      <div className="panel">
        <p>
          <FontAwesomeIcon icon="link" /> Import job id: {importJobId}
        </p>
        {progress ? (
          <>
            <p>
              <FontAwesomeIcon icon="chart-line" /> Status: {progress.status}
            </p>
            <p>
              <FontAwesomeIcon icon="check-circle" /> Imported: {progress.imported_count}
            </p>
            <p>
              <FontAwesomeIcon icon="exclamation-triangle" /> Failed: {progress.failed_count}
            </p>
            <p>
              <FontAwesomeIcon icon="clock" /> Queue pending: {progress.queue_pending}
            </p>
            <p>
              <FontAwesomeIcon icon="spinner" /> Queue leased: {progress.queue_leased}
            </p>
            <div className="inline">
              <button type="button" className="secondary" onClick={() => void loadProgress()}>
                <span>{refreshLabel}</span>
              </button>
              {isActive && (
                <button type="button" className="secondary" onClick={handleCancel}>
                  <span className="control-with-icon">
                    <FontAwesomeIcon icon="xmark-circle" />
                    <span>Cancel import</span>
                  </span>
                </button>
              )}
              <Link to="/conversations" className="action-link">
                <FontAwesomeIcon icon="comments" />
                <span>Open conversations</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="muted">Loading import progress...</p>
            <button type="button" className="secondary" onClick={() => void loadProgress()}>
              {refreshLabel}
            </button>
          </>
        )}
        {view.pollError && <p className="error">{view.pollError}</p>}
        {view.actionError && <p className="error">{view.actionError}</p>}
      </div>
    </section>
  )
}
