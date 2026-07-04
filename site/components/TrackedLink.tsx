'use client'

import type { ReactNode } from 'react'

declare global { interface Window { gtag?: (...args: unknown[]) => void } }

export function TrackedLink({ href, event, className, children }: { href: string, event: string, className?: string, children: ReactNode }) {
  return <a href={href} className={className} onClick={() => window.gtag?.('event', event, { link_url: href })}>{children}</a>
}
