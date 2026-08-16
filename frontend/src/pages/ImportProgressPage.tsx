import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cancelImport, getImportProgress } from '../api/endpoints'
import type { ImportProgressResponse } from '../api/types'
import { PageHeader } from '../components/PageHeader'

const IMPORT_PROGRESS_POLL_INTERVAL_MS = 3000
const TERMINAL_IMPORT_STATUSES = new Set(['completed', 'failed', 'cancelled'])

function isTerminalImportStatus(status: string) {
  return TERMINAL_IMPORT_STATUSES.has(status)
}

export function ImportProgressPage() {
  const { importJobId = '' } = useParams()
  const [progress, setProgress] = useState<ImportProgressResponse | null>(null)
  const [error, setError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(false)

  const loadProgress = useCallback(async () => {
    if (!importJobId) {
      return
    }

    try {
      const data = await getImportProgress(importJobId)
      if (!mountedRef.current) {
        return
      }
      setProgress(data)
      setError('')
      if (isTerminalImportStatus(data.status) && timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load import progress')
      }
    }
  }, [importJobId])

  useEffect(() => {
    if (!importJobId) {
      return
    }

    mountedRef.current = true
    void loadProgress()
    timerRef.current = setInterval(() => {
      void loadProgress()
    }, IMPORT_PROGRESS_POLL_INTERVAL_MS)

    return () => {
      mountedRef.current = false
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [importJobId, loadProgress])

  async function handleCancel() {
    if (!importJobId || !progress || isTerminalImportStatus(progress.status)) {
      return
    }
    try {
      await cancelImport(importJobId)
      await loadProgress()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel import')
    }
  }

  const isTerminal = progress !== null && isTerminalImportStatus(progress.status)

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
              {!isTerminal && (
                <button type="button" className="secondary" onClick={() => void loadProgress()}>
                  <span> {error ? 'Retry import progress' : 'Refresh import progress'}</span>
                </button>
              )}
              {!isTerminal && (
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
              {error ? 'Retry import progress' : 'Refresh import progress'}
            </button>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  )
}
