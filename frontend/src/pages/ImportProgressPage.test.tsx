// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ImportProgressResponse } from '../api/types'
import { ImportProgressPage } from './ImportProgressPage'

const { cancelImport, getImportProgress } = vi.hoisted(() => ({
  cancelImport: vi.fn(),
  getImportProgress: vi.fn(),
}))

vi.mock('../api/endpoints', () => ({ cancelImport, getImportProgress }))

function progress(status: string): ImportProgressResponse {
  return {
    import_job_id: 'job-123',
    status,
    imported_count: 4,
    failed_count: 0,
    queue_pending: 1,
    queue_leased: 1,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/imports/job-123/progress']}>
      <Routes>
        <Route path="/imports/:importJobId/progress" element={<ImportProgressPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function settle() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('ImportProgressPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it.each(['pending', 'running'])('continues polling while the status is %s', async (status) => {
    getImportProgress.mockResolvedValue(progress(status))

    renderPage()
    await settle()
    expect(getImportProgress).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000)
    })
    expect(getImportProgress).toHaveBeenCalledTimes(3)
  })

  it.each(['completed', 'failed', 'cancelled'])('stops polling after %s', async (status) => {
    getImportProgress.mockResolvedValue(progress(status))

    renderPage()
    await settle()
    expect(getImportProgress).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Cancel import' })).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000)
    })
    expect(getImportProgress).toHaveBeenCalledTimes(1)
  })

  it('clears a transient fetch error after a later successful refresh', async () => {
    getImportProgress
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValue(progress('running'))

    renderPage()
    await settle()
    expect(screen.queryByText('temporary outage')).not.toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(screen.queryByText('temporary outage')).toBeNull()
  })

  it('keeps a manual retry route available after a fetch failure', async () => {
    getImportProgress.mockRejectedValueOnce(new Error('network unavailable'))

    renderPage()
    await settle()
    expect(screen.queryByRole('button', { name: 'Retry import progress' })).not.toBeNull()

    getImportProgress.mockResolvedValueOnce(progress('pending'))
    fireEvent.click(screen.getByRole('button', { name: 'Retry import progress' }))
    await settle()

    expect(screen.queryByText('network unavailable')).toBeNull()
    expect(screen.queryByText('Status: pending')).not.toBeNull()
  })
})
