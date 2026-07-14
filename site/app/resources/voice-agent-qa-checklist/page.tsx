import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Production voice-agent QA checklist',
  description: 'A practical checklist for reviewing production voice-agent conversations with scorecards, evidence, human review, and regression checks.',
  alternates: { canonical: '/resources/voice-agent-qa-checklist' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Production QA checklist" title="Build a QA loop that leads from a bad call to a verified fix." description="Use production conversations, consistent evaluation criteria, evidence-led review, and follow-up checks to improve a voice agent without relying on random call sampling." />
    <section className="content-shell">
      <h2>Before you evaluate</h2>
      <ul><li>Define the customer outcome for each supported workflow.</li><li>Choose representative calls, including failures and edge cases.</li><li>Confirm provider permissions, retention, and evaluator data-handling choices.</li><li>Document what pass, fail, and uncertain mean for the scorecard.</li></ul>
      <h2>While you review</h2>
      <ul><li>Use scores to prioritize calls, then inspect transcript and available audio together when timing matters.</li><li>Require evaluator rationales to point to specific conversation evidence.</li><li>Escalate uncertain, sensitive, or consequential outcomes to a human reviewer.</li><li>Separate agent behavior from provider or infrastructure failures.</li></ul>
      <h2>After an agent change</h2>
      <ul><li>Group recurring failures by likely root cause and assign corrective work.</li><li>Retest against relevant historical examples and new production calls.</li><li>Compare quality signals over time, not only operational activity.</li><li>Keep the calls behind a regression visible to the people making the next change.</li></ul>
      <p><Link className="text-link" href="/voice-agent-qa">Read the production QA workflow <span aria-hidden="true">→</span></Link></p>
    </section>
    <Cta />
  </>
}
