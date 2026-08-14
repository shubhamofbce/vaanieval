'use client'

import { useEffect, useState } from 'react'

/* The same control the Observer console carries, down to the storage key and
 * the `d` shortcut, so the switch behaves identically on both surfaces.
 *
 * It is a switch, so it reports *state*: knob left is light, knob right is
 * dark, and both icons stay on the track the whole time. A control that
 * renamed itself as you used it could not be read at a glance, and there is
 * no honest resting label for a two-state switch anyway. `role="switch"` plus
 * `aria-checked` gives assistive tech the same reading the knob gives the eye.
 *
 * The stored choice is applied by an inline snippet in <head> before first
 * paint, so this file owns only the control and the persistence — applying it
 * from here would flash the wrong theme on load.
 */
const KEY = 'vaani.theme'

const SUN = 'M8 11.5A3.5 3.5 0 1 1 8 4.5a3.5 3.5 0 0 1 0 7Zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0-8a.7.7 0 0 1 .7.7v1.1a.7.7 0 1 1-1.4 0V2.7A.7.7 0 0 1 8 2Zm0 9.5a.7.7 0 0 1 .7.7v1.1a.7.7 0 1 1-1.4 0v-1.1a.7.7 0 0 1 .7-.7ZM2 8a.7.7 0 0 1 .7-.7h1.1a.7.7 0 1 1 0 1.4H2.7A.7.7 0 0 1 2 8Zm9.5 0a.7.7 0 0 1 .7-.7h1.1a.7.7 0 1 1 0 1.4h-1.1a.7.7 0 0 1-.7-.7ZM3.76 3.76a.7.7 0 0 1 .99 0l.78.78a.7.7 0 0 1-.99.99l-.78-.78a.7.7 0 0 1 0-.99Zm6.71 6.71a.7.7 0 0 1 .99 0l.78.78a.7.7 0 1 1-.99.99l-.78-.78a.7.7 0 0 1 0-.99Zm1.77-6.71a.7.7 0 0 1 0 .99l-.78.78a.7.7 0 0 1-.99-.99l.78-.78a.7.7 0 0 1 .99 0ZM5.53 10.47a.7.7 0 0 1 0 .99l-.78.78a.7.7 0 0 1-.99-.99l.78-.78a.7.7 0 0 1 .99 0Z'
const MOON = 'M6.2 2.4a.7.7 0 0 1 .16.76 4.9 4.9 0 0 0 6.48 6.48.7.7 0 0 1 .92.92A6.3 6.3 0 1 1 5.44 2.24a.7.7 0 0 1 .76.16Zm-1.5 1.7a4.9 4.9 0 1 0 7.2 7.2A6.3 6.3 0 0 1 4.7 4.1Z'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'd' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      event.preventDefault()
      apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const apply = (next: 'light' | 'dark') => {
    document.documentElement.dataset.theme = next
    try { localStorage.setItem(KEY, next) } catch { /* private mode */ }
    setTheme(next)
  }

  const dark = theme === 'dark'

  return <button
    type="button"
    className="theme-switch"
    role="switch"
    aria-checked={dark}
    aria-label="Dark theme"
    title="Dark theme  ·  d"
    data-mode={theme}
    onClick={() => apply(dark ? 'light' : 'dark')}
  >
    <span className="theme-switch-track" aria-hidden="true">
      <span className="theme-switch-knob" />
      <svg className="theme-switch-icon theme-switch-icon--sun" viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d={SUN} /></svg>
      <svg className="theme-switch-icon theme-switch-icon--moon" viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d={MOON} /></svg>
    </span>
  </button>
}
