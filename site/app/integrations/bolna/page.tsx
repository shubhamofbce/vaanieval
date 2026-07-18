import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { IntegrationStatus } from '@/components/IntegrationStatus'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Bolna voice-agent evaluation',
  description: 'Import Bolna production agent executions into a self-hosted workspace for evidence-led voice-agent QA and evaluation.',
  alternates: { canonical: '/integrations/bolna' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Bolna integration" title="Turn Bolna agent executions into quality evidence." description="Import real Bolna agent conversations, evaluate the behaviors that matter, and move from a dashboard trend to the transcript, call recording, and provider context behind it." />
    <section className="content-shell">
      <h2>What the integration brings into review</h2>
      <div className="card-grid"><div><h3>Agent discovery</h3><p>Find available Bolna agents before selecting executions to import.</p></div><div><h3>Conversation evidence</h3><p>Review normalized transcripts, cost and telephony metadata, and the call recording in one workspace.</p></div><div><h3>Evaluation results</h3><p>Run evaluator-backed scores and retain the rationale alongside each conversation.</p></div></div>
      <h2>Look beyond provider activity</h2>
      <p>Call duration and conversation volume are useful operational context. VaaniEval adds reviewable quality signals such as task completion, intent understanding, and required-information capture, so teams can inspect whether a call achieved the right outcome.</p>
      <div className="callout"><strong>Provider fields can vary.</strong><p>Bolna's transcript is a single formatted exchange without per-turn timestamps, so turn-level audio scrubbing is not available for Bolna calls today. Validate the transcript, metadata, and recording available through your Bolna configuration before defining a production review process.</p><Link className="text-link" href="/resources/evaluation-metrics">See the evaluation metrics guide <span aria-hidden="true">→</span></Link></div>
      <IntegrationStatus currentProvider="Bolna" />
    </section>
    <Cta />
  </>
}
