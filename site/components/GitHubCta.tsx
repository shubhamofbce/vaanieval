'use client'

import type { ReactNode } from 'react'
import { TrackedLink } from './TrackedLink'
import { siteConfig } from '@/lib/site'

export function GitHubCta({ className, event = 'github_star_click', children = 'Star on GitHub' }: { className?: string, event?: string, children?: ReactNode }) {
  return <TrackedLink className={className} href={siteConfig.githubUrl} event={event} target="_blank" rel="noreferrer">
    <svg className="github-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.44-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.63 7.63 0 0 1 4.01 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" fill="currentColor" /></svg>
    <span>{children}</span>
  </TrackedLink>
}
