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
    <PageHero eyebrow="Voice-agent evaluation" title="Turn production conversation data into reviewable quality signals." description="VaaniEval helps product, QA, and engineering teams score meaningful behavior, identify weak calls, and inspect the evidence before changing an agent." />
    <section className="content-shell">
      <h2>Platform reporting is only the start</h2>
      <p>Volume, duration, and completed calls explain operational activity. They do not always explain whether an agent understood the caller, captured the right information, or completed the task correctly. Evaluation adds that missing quality layer.</p>
      <div className="card-grid"><div><h3>Import real calls</h3><p>Normalize production conversations from supported voice providers for one review workflow.</p></div><div><h3>Evaluate behavior</h3><p>Run a consistent scorecard with stored results and rationales.</p></div><div><h3>Verify improvements</h3><p>Follow trends to individual conversations and check new calls after an agent change.</p></div></div>
      <div className="callout"><strong>Evidence stays attached.</strong><p>Move from a dashboard result to the transcript, available audio, and evaluator rationale behind the call.</p><Link className="text-link" href="/resources/evaluation-metrics">Explore the evaluation scorecard <span aria-hidden="true">→</span></Link></div>
    </section>
    <Cta />
  </>
}
