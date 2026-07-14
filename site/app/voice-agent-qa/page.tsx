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
    <PageHero eyebrow="Production QA" title="Replace random call sampling with a repeatable voice-agent quality loop." description="Review the calls that matter, evaluate a stable set of behaviors, keep evidence visible, and verify whether an agent change improved the next production conversations." />
    <section className="content-shell">
      <h2>A practical operating loop</h2>
      <ol><li>Import representative production conversations.</li><li>Evaluate a stable scorecard of business-critical behaviors.</li><li>Review failed and uncertain cases with transcript, available audio, and rationale evidence.</li><li>Group repeated failures and assign corrective work.</li><li>Evaluate new conversations to check for regression.</li></ol>
      <h2>Keep humans in consequential decisions</h2>
      <p>Automated evaluation helps teams prioritize what to inspect. Human reviewers should validate uncertain, sensitive, or high-impact findings and calibrate the scorecard against representative calls before treating it as an operational gate.</p>
      <p><Link className="button" href="/resources/voice-agent-qa-checklist">Use the production QA checklist</Link></p>
    </section>
    <Cta />
  </>
}
