import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Self-hosted voice-agent evaluation workspace',
  description: 'Evaluate production voice-agent conversations with evidence-led scorecards, rationales, quality trends, and self-hosted deployment control.',
  alternates: { canonical: '/voice-ai-evaluation' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Voice-agent evaluation" title="Your agent changed. Which tests are now wrong?" description="VaaniEval connects production behavior to evaluation coverage, so your team can identify what is still representative, what may be stale, and what needs review." />
    <section className="content-shell">
      <h2>A passing suite can still be the wrong suite.</h2>
      <p>A release can alter a prompt, model, tool, policy, or fallback path without turning an existing test red. Production calls can then diverge from the behavior your suite was written to protect.</p>
      <div className="card-grid"><div><span className="card-kicker">01 / Change</span><h3>Track what moved</h3><p>Start with an agent release and the production behavior that deserves investigation.</p></div><div><span className="card-kicker">02 / Coverage</span><h3>Classify relevance</h3><p>Review whether a test is still representative, possibly stale, missing, or redundant.</p></div><div><span className="card-kicker">03 / Evidence</span><h3>Decide with context</h3><p>Use the transcript, available audio, trace, and outcome to decide what belongs in the suite.</p></div></div>
      <div className="callout"><strong>Not another opaque score.</strong><p>VaaniEval is being built as a reviewable path from changed behavior to a coverage decision. The team responsible for the agent remains in control of the change.</p><Link className="text-link" href="/resources/evaluation-metrics">Explore the evaluation scorecard <span aria-hidden="true">↗</span></Link></div>
    </section>
    <Cta />
  </>
}
