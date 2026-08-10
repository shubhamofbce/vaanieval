import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The requested VaaniEval page could not be found.',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return <section className="page-hero shell">
    <p className="eyebrow">404</p>
    <h1>This page does not exist.</h1>
    <p className="lede">Return to the VaaniEval homepage or explore the production Voice AI guides.</p>
    <div className="actions">
      <Link className="button" href="/">Back to homepage</Link>
      <Link className="button button-secondary" href="/resources/evaluation-metrics">Explore resources</Link>
    </div>
  </section>
}
