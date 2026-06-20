import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cancelImport, getImportProgress } from '../api/endpoints'
import type { ImportProgressResponse } from '../api/types'
import { PageHeader } from '../components/PageHeader'

export function ImportProgressPage() {
  const { importJobId = '' } = useParams()
  const [progress, setProgress] = useState<ImportProgressResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!importJobId) {
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const data = await getImportProgress(importJobId)
        if (!cancelled) {
          setProgress(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load import progress')
        }
      }
    }

    void load()
    const timer = setInterval(() => {
      void load()
    }, 3000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [importJobId])

  async function handleCancel() {
    if (!importJobId) {
      return
    }
    try {
      await cancelImport(importJobId)
      const refreshed = await getImportProgress(importJobId)
      setProgress(refreshed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel import')
    }
  }

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
              <button type="button" className="secondary" onClick={handleCancel}>
                <span className="control-with-icon">
                  <FontAwesomeIcon icon="xmark-circle" />
                  <span>Cancel import</span>
                </span>
              </button>
              <Link to="/conversations" className="action-link">
                <FontAwesomeIcon icon="comments" />
                <span>Open conversations</span>
              </Link>
            </div>
          </>
        ) : (
          <p className="muted">Loading import progress...</p>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  )
}
