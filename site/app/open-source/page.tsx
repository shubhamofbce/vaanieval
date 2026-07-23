import type { Metadata } from 'next'
import { GitHubCta } from '@/components/GitHubCta'
import { BookingButton } from '@/components/BookingButton'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Open-source voice-agent evaluation',
  description: 'Self-host, study, and modify VaaniEval under the GNU Affero General Public License v3.0.',
  alternates: { canonical: '/open-source' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Open source · AGPL-3.0" title="Self-host and extend VaaniEval." description="VaaniEval is open-source software under the GNU Affero General Public License v3.0. You can use, study, modify, and distribute it under that license." />
    <section className="content-shell">
      <h2>What is in the repository</h2>
      <div className="card-grid"><div><h3>Review workspace</h3><p>React interfaces for conversation review, evaluation results, trends, and provider settings.</p></div><div><h3>Evaluation service</h3><p>A FastAPI service, background worker, evaluator-provider modules, tests, and database migrations.</p></div><div><h3>Provider adapters</h3><p>Adapter-based imports for supported voice providers so provider-specific behavior remains isolated.</p></div></div>
      <h2>AGPL-3.0 and hosted modifications</h2>
      <p>You may deploy and modify VaaniEval in your own environment. If you modify it and let users interact with that modified version over a network, AGPL section 13 requires you to offer those users the corresponding source code for your version. Self-hosting still makes you responsible for access, retention, provider permissions, security, and infrastructure choices.</p>
      <div className="callout"><strong>Choose your next step.</strong><p>Inspect the repository, self-host the project, or book a walkthrough of the managed workflow.</p><div className="inline-links"><BookingButton event="calendar_booking_open_source_open">Book a demo</BookingButton><GitHubCta className="button button-secondary" event="github_star_open_source_click" /><a className="text-link" href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noreferrer">Read the AGPL-3.0 <span aria-hidden="true">→</span></a></div></div>
    </section>
  </>
}
