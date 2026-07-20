import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMe } from '../api/endpoints'

const VERSION = 1
const PREFIX = 'vaanieval:ui'

type Envelope<T> = { version: number; value: T }

function storageKey(namespace: string, userId: string, workspaceId: string) {
  return `${PREFIX}:v${VERSION}:${userId}:${workspaceId}:${namespace}`
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readScopedState<T>(namespace: string, userId: string, workspaceId: string): T | null {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(storageKey(namespace, userId, workspaceId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Envelope<T>
    return parsed && parsed.version === VERSION && 'value' in parsed ? parsed.value : null
  } catch {
    return null
  }
}

export function removeScopedState(namespace: string, userId: string, workspaceId: string) {
  if (!canUseStorage()) return
  try { window.localStorage.removeItem(storageKey(namespace, userId, workspaceId)) } catch { /* storage can be unavailable */ }
}

/**
 * Persists only benign UI state. Data is versioned and isolated by the current
 * authenticated user and workspace. Writes are intentionally delayed so text
 * inputs do not synchronously write on every keystroke.
 */
export function usePersistedState<T>(namespace: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, () => void] {
  const { data: identity } = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false })
  const [value, setValue] = useState<T>(initialValue)
  const hydratedFor = useRef<string | null>(null)
  const suppressWrites = useRef(false)
  const initialRef = useRef(initialValue)
  const scope = identity ? `${identity.user_id}:${identity.workspace_id}` : null

  useEffect(() => {
    if (!identity || !scope || hydratedFor.current === scope) return
    const restored = readScopedState<T>(namespace, identity.user_id, identity.workspace_id)
    suppressWrites.current = false
    setValue(restored ?? initialRef.current)
    hydratedFor.current = scope
  }, [identity, namespace, scope])

  useEffect(() => {
    if (!identity || !scope || hydratedFor.current !== scope || suppressWrites.current || !canUseStorage()) return
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey(namespace, identity.user_id, identity.workspace_id), JSON.stringify({ version: VERSION, value }))
      } catch { /* quota/privacy failures should never break the UI */ }
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [identity, namespace, scope, value])

  const setPersistedValue: Dispatch<SetStateAction<T>> = (next) => {
    suppressWrites.current = false
    setValue(next)
  }
  const clear = () => {
    if (identity) removeScopedState(namespace, identity.user_id, identity.workspace_id)
    // Used after explicit server saves. A subsequent user edit re-enables writes.
    suppressWrites.current = true
  }
  return [value, setPersistedValue, clear]
}
