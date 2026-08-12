import type { Metadata } from 'next'
import Link from 'next/link'
import { BookingButton } from '@/components/BookingButton'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Voice AI design partner program',
  description: 'Work with VaaniEval to build a private voice model benchmark from your own production calls, deployed inside your environment.',
  alternates: { canonical: '/design-partners' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Design-partner program" title="Build your private voice model benchmark with us." description="We work with a small number of enterprise voice teams that run real call volume and cannot send customer conversations to a hosted evaluation vendor." />
    <section className="content-shell">
      <h2>We are a fit when the model decision is expensive</h2>
      <div className="card-grid">
        <div><span className="card-kicker">Your traffic</span><h3>Real production volume</h3><p>You already run voice agents at scale, across languages, accents, and noisy telephony conditions.</p></div>
        <div><span className="card-kicker">Your constraint</span><h3>Data residency is non-negotiable</h3><p>Security, legal, or regulation prevents you from uploading production calls to a third-party evaluation platform.</p></div>
        <div><span className="card-kicker">Your decision</span><h3>A model choice with consequences</h3><p>Switching STT, LLM, or TTS providers changes cost, latency, and customer outcomes, and you need evidence before you commit.</p></div>
      </div>

      <h2>What you get</h2>
      <ul>
        <li>A deployment design for on-premises or customer-controlled cloud, reviewed with your infrastructure and security teams.</li>
        <li>Hands-on help building your first representative benchmark set from your own calls.</li>
        <li>A model-comparison report covering quality, latency, cost, and downstream impact.</li>
        <li>Direct influence over the roadmap, integrations, and evaluation templates we build next.</li>
      </ul>

      <h2>What we ask</h2>
      <p>Time from someone who owns the model decision, access to a representative slice of calls inside your environment, and honest feedback when the product is wrong. We are early: this is a working relationship, not a purchase.</p>

      <div className="callout"><strong>Start with the decision you are stuck on.</strong><p>Tell us which model you are evaluating, what your calls look like, and what your security team requires. We will show you how the same evaluation would run inside your environment.</p><div className="inline-links"><BookingButton className="button" event="calendar_booking_design_partner_open">Apply as a design partner <span aria-hidden="true">↗</span></BookingButton><Link className="text-link" href="/deployment">Review deployment architecture <span aria-hidden="true">↗</span></Link></div></div>
    </section>
  </>
}
