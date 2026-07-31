import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Production voice-agent QA',
  description: 'Build a repeatable voice-agent QA workflow from production-call evidence, evaluator-backed scorecards, human review, and regression checks.',
  alternates: { canonical: '/voice-agent-qa' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Production QA" title="A bad call should lead to a precise next change." description="Build a repeatable Voice AI QA loop around production evidence, stable evaluation criteria, and regression checks that remain relevant as the agent evolves." />
    <section className="content-shell">
      <h2>A practical operating loop</h2>
      <ol><li>Start with representative production conversations and the customer outcome that mattered.</li><li>Evaluate a stable scorecard of business-critical behaviors.</li><li>Investigate failed and uncertain cases with transcript, available audio, timing, tool events, and rationale evidence.</li><li>Map repeated failures to the prompt, tool, policy, or workflow that owns the issue.</li><li>Check both new calls and evaluation coverage after the change ships.</li></ol>
      <h2>Keep humans in consequential decisions</h2>
      <p>Automated evaluation helps teams prioritize what to inspect. Human reviewers should validate uncertain, sensitive, or high-impact findings and calibrate the scorecard against representative calls before treating it as an operational gate.</p>
      <p><Link className="button" href="/resources/voice-agent-qa-checklist">Use the production QA checklist</Link></p>
    </section>
    <Cta />
  </>
}
