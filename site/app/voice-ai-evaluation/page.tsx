import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Voice model evaluation workspace',
  description: 'Build a private benchmark from production calls and compare STT, LLM, and TTS models on quality, latency, cost, and downstream impact inside your own environment.',
  alternates: { canonical: '/voice-ai-evaluation' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="Evaluation workspace" title="Your calls are the only benchmark that matters." description="VaaniEval replays your real production scenarios through candidate STT, LLM, and TTS models and shows exactly where they disagree, how much it costs, and what it changes for the customer." />
    <section className="content-shell">
      <h2>A benchmark built on generic data cannot predict your calls</h2>
      <p>Public leaderboards are measured on curated datasets. Your traffic is not curated. It carries regional accents, code-switching, domain vocabulary, telephony compression, background noise, interruptions, and the specific details that drive an action: names, amounts, dates, and identifiers.</p>
      <div className="card-grid">
        <div><span className="card-kicker">01 / Dataset</span><h3>Private benchmark set</h3><p>Select representative production calls and freeze them into a reusable evaluation set with the outcomes that mattered.</p></div>
        <div><span className="card-kicker">02 / Replay</span><h3>Identical scenarios</h3><p>Run the same audio and conversation state through your current stack and every candidate model, offline or in shadow.</p></div>
        <div><span className="card-kicker">03 / Diagnosis</span><h3>Turn-level evidence</h3><p>Inspect the audio, transcripts, word-level disagreements, tool decisions, timing, and the response the caller would have heard.</p></div>
      </div>

      <h2>What VaaniEval measures</h2>
      <ul>
        <li><strong>Transcription quality where it counts.</strong> Aggregate error rates plus flagged disagreements on names, numbers, dates, locations, and domain terms.</li>
        <li><strong>Conversational latency.</strong> Endpointing behavior, time-to-first-token, time-to-first-audio, and turn latency distribution, not just averages.</li>
        <li><strong>Downstream decisions.</strong> Whether a transcript difference changed the LLM response, the tool call, or the final outcome.</li>
        <li><strong>Speech output quality.</strong> TTS pronunciation of critical entities, prosody on numbers, and failure modes in your target languages.</li>
        <li><strong>Cost and reliability.</strong> Cost per call, error and timeout rates, and provider stability across the same run.</li>
      </ul>

      <h2>Offline replay and real-time shadow</h2>
      <p>Offline replay is the cheapest way to compare models across a large historical set. Real-time shadow evaluation runs candidates alongside live traffic so you can observe behavior under real conditions before a customer ever hears the new stack.</p>
      <p>Shadow evaluation raises provider spend and, if you select hosted models, creates an external data path. VaaniEval treats that as a governed decision with routing controls, redaction, budgets, and audit logs rather than a hidden default. <Link className="text-link" href="/deployment">See how deployment and routing work</Link>.</p>

      <div className="callout"><strong>Comparative evidence, not synthetic ground truth.</strong><p>Model-to-model disagreement tells you where stacks diverge and which differences carry risk. For high-stakes accuracy claims, pair it with a human-reviewed reference set. We will say this in the demo too.</p><Link className="text-link" href="/resources/evaluation-metrics">Explore the evaluation metrics guide <span aria-hidden="true">↗</span></Link></div>
    </section>
    <Cta />
  </>
}
