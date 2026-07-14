import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Vapi voice-agent evaluation',
  description: 'Import Vapi production conversations into a self-hosted workspace for evidence-led voice-agent QA and evaluation.',
  alternates: { canonical: '/integrations/vapi' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Vapi integration" title="Evaluate what happened in your Vapi agent conversations." description="Bring production conversation records into a review workflow that connects agent quality scores to the calls, transcripts, and provider context behind them." />
    <section className="content-shell">
      <h2>A provider-adapter workflow</h2>
      <div className="card-grid"><div><h3>Connect and import</h3><p>Connect Vapi credentials in provider settings and import production conversation records.</p></div><div><h3>Review the call</h3><p>Inspect normalized transcript and provider metadata before acting on an aggregate trend.</p></div><div><h3>Evaluate quality</h3><p>Use configured evaluator providers to score consistent production behaviors.</p></div></div>
      <h2>Make operational data actionable</h2>
      <p>Use evaluation to identify whether an agent understood the caller, captured the information it needed, and completed the intended task—not only whether a call occurred or ended.</p>
      <div className="callout"><strong>Provider fields can vary.</strong><p>Validate the transcript, metadata, and media available through your Vapi configuration before defining a production review process. Keep the evidence attached to every decision.</p><Link className="text-link" href="/resources/evaluation-metrics">See the evaluation metrics guide <span aria-hidden="true">→</span></Link></div>
    </section>
    <Cta />
  </>
}
