// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import type { ImportProgressResponse } from '../api/types'
import { ImportProgressPage } from './ImportProgressPage'

const { cancelImport, getImportProgress } = vi.hoisted(() => ({
  cancelImport: vi.fn(),
  getImportProgress: vi.fn(),
}))

vi.mock('../api/endpoints', () => ({ cancelImport, getImportProgress }))

// The statuses an import job can actually hold, per backend/app/models/import_job.py.
const ACTIVE_IMPORT_STATUSES = ['queued', 'running', 'paused']
const TERMINAL_IMPORT_STATUSES = ['completed', 'failed', 'cancelled']
// Statuses the backend does not emit today. An allow-list must treat them as
// non-active so a future status cannot silently restore the endless polling of issue #2.
const UNKNOWN_IMPORT_STATUSES = ['expired', 'timed_out']

const POLL_INTERVAL_MS = 3000

function progress(status: string, importJobId = 'job-a'): ImportProgressResponse {
  return {
    import_job_id: importJobId,
    status,
    imported_count: 4,
    failed_count: 0,
    queue_pending: 1,
    queue_leased: 1,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolveFn, rejectFn) => {
    resolve = resolveFn
    reject = rejectFn
  })
  return { promise, resolve, reject }
}

function JobSwitcher() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => void navigate('/imports/job-b')}>
      Switch job
    </button>
  )
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/imports/job-a']}>
      <JobSwitcher />
      <Routes>
        <Route path="/imports/:importJobId" element={<ImportProgressPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function settle() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function callsFor(importJobId: string) {
  return getImportProgress.mock.calls.filter(([id]) => id === importJobId).length
}

describe('ImportProgressPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it.each(ACTIVE_IMPORT_STATUSES)('keeps polling while the status is %s', async (status) => {
    getImportProgress.mockResolvedValue(progress(status))

    renderPage()
    await settle()
    expect(getImportProgress).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Cancel import' })).not.toBeNull()

    await advance(POLL_INTERVAL_MS * 2)
    expect(getImportProgress).toHaveBeenCalledTimes(3)
  })

  it.each(TERMINAL_IMPORT_STATUSES)('stops polling once the status is %s', async (status) => {
    getImportProgress.mockResolvedValue(progress(status))

    renderPage()
    await settle()
    expect(getImportProgress).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Cancel import' })).toBeNull()

    await advance(POLL_INTERVAL_MS * 3)
    expect(getImportProgress).toHaveBeenCalledTimes(1)
  })

  it.each(UNKNOWN_IMPORT_STATUSES)(
    'stops polling for the status %s, which is outside the active allow-list',
    async (status) => {
      getImportProgress.mockResolvedValue(progress(status))

      renderPage()
      await settle()
      expect(getImportProgress).toHaveBeenCalledTimes(1)

      await advance(POLL_INTERVAL_MS * 3)
      expect(getImportProgress).toHaveBeenCalledTimes(1)
    },
  )

  it('ignores a stale active response that resolves after a newer terminal one', async () => {
    const stale = deferred<ImportProgressResponse>()
    const fresh = deferred<ImportProgressResponse>()
    getImportProgress.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise)

    renderPage()
    await settle()
    expect(getImportProgress).toHaveBeenCalledTimes(1)

    // The interval fires a second request while the first is still unresolved.
    await advance(POLL_INTERVAL_MS)
    expect(getImportProgress).toHaveBeenCalledTimes(2)

    // The newer request answers first, and it is terminal.
    fresh.resolve(progress('completed'))
    await settle()
    expect(screen.queryByText('Status: completed')).not.toBeNull()

    // The older request answers afterwards; its stale active status must be dropped.
    stale.resolve(progress('running'))
    await settle()
    expect(screen.queryByText('Status: running')).toBeNull()
    expect(screen.queryByText('Status: completed')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel import' })).toBeNull()

    // ...and the stale response must not resurrect polling either.
    await advance(POLL_INTERVAL_MS * 3)
    expect(getImportProgress).toHaveBeenCalledTimes(2)
  })

  it('drops an in-flight response from a previous import job and keeps the new job polling', async () => {
    const previousJob = deferred<ImportProgressResponse>()
    getImportProgress.mockImplementation((importJobId: string) =>
      importJobId === 'job-a' ? previousJob.promise : Promise.resolve(progress('running', 'job-b')),
    )

    renderPage()
    await settle()
    expect(callsFor('job-a')).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Switch job' }))
    await settle()
    expect(screen.queryByText('Import job id: job-b')).not.toBeNull()
    expect(callsFor('job-b')).toBe(1)

    // The abandoned job answers late, with a terminal status.
    previousJob.resolve(progress('completed', 'job-a'))
    await settle()
    expect(screen.queryByText('Status: completed')).toBeNull()
    expect(screen.queryByText('Status: running')).not.toBeNull()

    // The new job's poller must have survived the abandoned job's response.
    await advance(POLL_INTERVAL_MS * 2)
    expect(callsFor('job-b')).toBe(3)
    expect(callsFor('job-a')).toBe(1)
  })

  it('stops polling after the page unmounts', async () => {
    getImportProgress.mockResolvedValue(progress('queued'))

    const view = renderPage()
    await settle()
    expect(getImportProgress).toHaveBeenCalledTimes(1)

    view.unmount()
    await advance(POLL_INTERVAL_MS * 3)
    expect(getImportProgress).toHaveBeenCalledTimes(1)
  })

  it('clears a transient fetch error after a later successful poll', async () => {
    getImportProgress
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValue(progress('queued'))

    renderPage()
    await settle()
    expect(screen.queryByText('temporary outage')).not.toBeNull()

    await advance(POLL_INTERVAL_MS)
    expect(screen.queryByText('temporary outage')).toBeNull()
    expect(screen.queryByText('Status: queued')).not.toBeNull()
  })

  it('keeps a manual retry route available after a fetch failure', async () => {
    getImportProgress.mockRejectedValueOnce(new Error('network unavailable'))

    renderPage()
    await settle()
    expect(screen.queryByRole('button', { name: 'Retry import progress' })).not.toBeNull()

    getImportProgress.mockResolvedValue(progress('queued'))
    fireEvent.click(screen.getByRole('button', { name: 'Retry import progress' }))
    await settle()

    expect(screen.queryByText('network unavailable')).toBeNull()
    expect(screen.queryByText('Status: queued')).not.toBeNull()
  })

  it('clears a poll error on a later success but preserves a failed cancellation', async () => {
    getImportProgress.mockResolvedValueOnce(progress('running'))
    cancelImport.mockRejectedValueOnce(new Error('cancel refused'))

    renderPage()
    await settle()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel import' }))
    await settle()
    expect(screen.queryByText('cancel refused')).not.toBeNull()

    getImportProgress.mockRejectedValueOnce(new Error('temporary outage'))
    await advance(POLL_INTERVAL_MS)
    expect(screen.queryByText('temporary outage')).not.toBeNull()
    expect(screen.queryByText('cancel refused')).not.toBeNull()

    getImportProgress.mockResolvedValue(progress('running'))
    await advance(POLL_INTERVAL_MS)
    expect(screen.queryByText('temporary outage')).toBeNull()
    expect(screen.queryByText('cancel refused')).not.toBeNull()
  })
})
