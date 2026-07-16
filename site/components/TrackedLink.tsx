'use client'

import { track } from '@vercel/analytics'
import type { ReactNode } from 'react'

declare global { interface Window { gtag?: (...args: unknown[]) => void } }

export function TrackedLink({ href, event, className, children, target, rel }: { href: string, event: string, className?: string, children: ReactNode, target?: string, rel?: string }) {
  const handleClick = () => {
    track(event, { link_url: href })
    window.gtag?.('event', event, { link_url: href })
  }

  return <a href={href} className={className} target={target} rel={rel} onClick={handleClick}>{children}</a>
}
