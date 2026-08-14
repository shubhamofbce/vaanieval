'use client'

import { useEffect } from 'react'
import { track } from '@vercel/analytics'
import { capture, toProps, decorate } from '@/lib/attribution'

/* Mounted once in the root layout.
 *
 * Two jobs, both of which have to happen on every page rather than only the
 * home page: a shared link can point anywhere, and the CTA that leaves for the
 * demo console appears in the header on every route.
 */
export function AttributionTracker() {
  useEffect(() => {
    const { first, last, isNew } = capture()
    const props = toProps()

    /* Fired once per first-ever tagged visit, so campaign volume is countable
       without deduplicating repeat sessions by hand later. */
    if (isNew && first) {
      const payload = { source: first.source || first.ref || first.referrer || 'direct', medium: first.medium || 'none', campaign: first.campaign || 'none', ref: first.ref || 'none' }
      track('attribution_first_touch', payload)
      window.gtag?.('event', 'attribution_first_touch', payload)
    }

    /* Attached to every later GA4 event in this session, so a booking or a demo
       open reports its own source without each call site remembering to. */
    if (Object.keys(props).length) {
      window.gtag?.('set', 'user_properties', {
        first_source: first?.source || first?.ref || first?.referrer || 'direct',
        first_campaign: first?.campaign || 'none',
        last_source: last?.source || last?.ref || last?.referrer || 'direct',
      })
    }

    /* Link decoration is delegated rather than baked into each href: the href
       stays clean for crawlers and for anyone copying it, and links rendered
       later are covered without re-running anything. Capture phase, so it wins
       over handlers that navigate themselves. */
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a')
      if (!anchor || !anchor.href) return
      if (anchor.dataset.noAttribution === 'true') return
      const decorated = decorate(anchor.href)
      if (decorated !== anchor.href) anchor.href = decorated
    }
    /* Middle-click and keyboard activation never fire a plain click first. */
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Enter') onClick(event as unknown as MouseEvent) }
    document.addEventListener('click', onClick, true)
    document.addEventListener('auxclick', onClick, true)
    document.addEventListener('keydown', onKey, true)

    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('auxclick', onClick, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [])

  return null
}
