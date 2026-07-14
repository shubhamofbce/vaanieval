import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Voice-agent evaluation metrics',
  description: 'Use a practical voice-agent scorecard for task completion, intent understanding, required information, and human-like delivery—with evidence behind each result.',
  alternates: { canonical: '/resources/evaluation-metrics' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Metrics guide" title="Measure whether a voice-agent call actually worked." description="Start with a small, reviewable scorecard. Aggregate metrics show where to look; the conversation, rationale, and evidence explain what to fix." />
    <section className="content-shell">
      <h2>The current production scorecard</h2>
      <div className="card-grid"><div><h3>Task completion</h3><p>Did the caller reach the intended customer and business outcome?</p></div><div><h3>Intent understanding</h3><p>Did the agent understand what the caller needed before responding or acting?</p></div><div><h3>Required information</h3><p>Did the workflow capture the information it needed to move forward?</p></div></div>
      <h2>Read scores with evidence</h2>
      <p>Scores are prioritization signals, not an automatic truth. Review the evaluator rationale and supporting conversation evidence, especially for uncertain or high-impact calls. Keep human review in the loop when the outcome matters.</p>
      <h2>Additional quality signals to define for your workflow</h2>
      <ul><li>Resolution quality: was the outcome correct, complete, and communicated clearly?</li><li>Fallback behavior: did the agent recover safely when it could not proceed?</li><li>Unsupported claims: did it make a statement not grounded in available policy, tools, or context?</li><li>Operational context: latency, interruptions, silence, repeated turns, and premature termination where provider data makes them available.</li></ul>
      <div className="callout"><strong>Custom criteria are a design-partner roadmap.</strong><p>VaaniEval currently starts with a focused evaluator scorecard. Teams helping shape the product can influence future custom-rubric and criteria-suggestion capabilities.</p><Link className="text-link" href="/design-partners">Help shape the roadmap <span aria-hidden="true">→</span></Link></div>
    </section>
    <Cta />
  </>
}
