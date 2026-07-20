import type { Metadata } from 'next'
import { GitHubCta } from '@/components/GitHubCta'
import { BookingButton } from '@/components/BookingButton'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Source-available voice-agent evaluation',
  description: 'Inspect VaaniEval source code and learn how to request permission for commercial or noncommercial use, deployment, or modification.',
  alternates: { canonical: '/open-source' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Source available · Proprietary license" title="Inspect the VaaniEval source and request permission to use it." description="The repository is available for inspection. Commercial and noncommercial use, copying, modification, distribution, hosting, deployment, and derivative works require prior written permission." />
    <section className="content-shell">
      <h2>What is in the repository</h2>
      <div className="card-grid"><div><h3>Review workspace</h3><p>React interfaces for conversation review, evaluation results, trends, and provider settings.</p></div><div><h3>Evaluation service</h3><p>A FastAPI service, background worker, evaluator-provider modules, tests, and database migrations.</p></div><div><h3>Provider adapters</h3><p>Adapter-based imports for supported voice providers so provider-specific behavior remains isolated.</p></div></div>
      <h2>A visible path from score to source</h2>
      <p>Written permission is required before using the code to operate an evaluation workspace or incorporating any part of it into another project. Authorized deployments remain responsible for access, retention, provider permissions, security, and infrastructure choices.</p>
      <div className="callout"><strong>Choose your next step.</strong><p>Book a walkthrough, inspect the repository, or contact us to request written permission.</p><div className="inline-links"><BookingButton event="calendar_booking_open_source_open">Book a demo</BookingButton><GitHubCta className="button button-secondary" event="github_star_open_source_click" /><a className="text-link" href="mailto:shubham@vaanieval.com">Request permission <span aria-hidden="true">→</span></a></div></div>
    </section>
  </>
}
