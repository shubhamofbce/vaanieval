import type { Metadata } from 'next'
import Link from 'next/link'
import { BookingButton } from '@/components/BookingButton'
import { PageHero } from '@/components/PageHero'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Voice AI design partner program',
  description: 'Work with VaaniEval on a living evaluation system for production Voice AI agents.',
  alternates: { canonical: '/design-partners' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Design-partner program" title="Build the quality layer your Voice AI product is missing." description="VaaniEval is working with a small number of production Voice AI teams where agent releases, real calls, and evaluation coverage need to stay aligned." />
    <section className="content-shell">
      <h2>We are a fit when the agent is the product.</h2>
      <div className="card-grid"><div><span className="card-kicker">Your reality</span><h3>You ship often</h3><p>Prompts, tools, models, policies, and conversation paths change faster than a small team can maintain a static test suite.</p></div><div><span className="card-kicker">Your risk</span><h3>A call can change an outcome</h3><p>The agent schedules, supports, teaches, qualifies, advises, or resolves work that matters to a customer.</p></div><div><span className="card-kicker">Your need</span><h3>Coverage must stay useful</h3><p>You need to understand whether tests still represent your production agent, not simply whether a dashboard score moved.</p></div></div>
      <h2>What working together looks like</h2>
      <p>We start from a real release process and a real failure mode. You help define which changes, production signals, and coverage decisions need to be visible. We build the workflow with you and keep recommendations reviewable by the team responsible for the agent.</p>
      <div className="callout"><strong>Start with the workflow, not a pitch deck.</strong><p>Tell us what your agent does, what has changed recently, and where evaluation or production debugging is slowing the team down.</p><div className="inline-links"><Link className="button" href="/#design-partner">Apply to build with us <span aria-hidden="true">↗</span></Link><BookingButton className="text-link" event="calendar_booking_design_partner_open">Talk to the founder <span aria-hidden="true">↗</span></BookingButton><a className="text-link" href={siteConfig.githubUrl}>Inspect the repository <span aria-hidden="true">↗</span></a></div></div>
    </section>
  </>
}
