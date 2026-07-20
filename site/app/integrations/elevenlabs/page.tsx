import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { IntegrationStatus } from '@/components/IntegrationStatus'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'ElevenLabs voice-agent evaluation',
  description: 'Import ElevenLabs production conversations into a self-hosted workspace to evaluate task completion, intent understanding, and conversation evidence.',
  alternates: { canonical: '/integrations/elevenlabs' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="ElevenLabs integration" title="Turn ElevenLabs conversation records into quality evidence." description="Import real agent conversations, evaluate the behaviors that matter, and move from a dashboard trend to the transcript, available audio, and rationale behind it." />
    <section className="content-shell">
      <h2>What the integration brings into review</h2>
      <div className="card-grid"><div><h3>Agent discovery</h3><p>Find available ElevenLabs agents before selecting conversations to import.</p></div><div><h3>Conversation evidence</h3><p>Review normalized transcripts, provider metadata, and available media in one workspace.</p></div><div><h3>Evaluation results</h3><p>Run evaluator-backed scores and retain the rationale alongside each conversation.</p></div></div>
      <h2>Look beyond provider activity</h2>
      <p>Call duration and conversation volume are useful operational context. VaaniEval adds reviewable quality signals such as task completion, intent understanding, and required-information capture, so teams can inspect whether a call achieved the right outcome.</p>
      <div className="callout"><strong>Run the workflow in your environment.</strong><p>VaaniEval can be self-hosted with prior written permission. Authorized deployments control provider permissions, evaluator configuration, retention, and access policies.</p><Link className="text-link" href="/open-source">Review source and license terms <span aria-hidden="true">→</span></Link></div>
      <IntegrationStatus currentProvider="ElevenLabs" />
    </section>
    <Cta />
  </>
}
