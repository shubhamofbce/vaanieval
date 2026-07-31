import type { Metadata } from 'next'
import Link from 'next/link'
import { GitHubCta } from '@/components/GitHubCta'
import { WaitlistForm } from '@/components/WaitlistForm'

export const metadata: Metadata = {
  title: 'Voice AI observability and self-healing evaluations',
  description: 'VaaniEval helps production Voice AI teams investigate failures and keep evaluation coverage current as agents change.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'VaaniEval | Voice AI observability and evaluations',
    description: 'Investigate production voice-agent failures and keep evaluation coverage current as your agents change.',
    url: '/',
  },
}

const signals = [
  ['Conversation flow', 'Trace what happened across each turn, tool call, and agent decision.'],
  ['Voice behavior', 'Investigate latency, interruptions, transcript quality, and handoffs in context.'],
  ['Customer outcome', 'Connect a technical failure to whether the caller actually reached the intended result.'],
]

const loop = [
  ['01', 'A change ships', 'A prompt, model, tool, policy, or conversation path changes.'],
  ['02', 'A meaningful difference appears', 'Production signals and agent changes reveal where coverage may no longer reflect reality.'],
  ['03', 'Coverage evolves', 'VaaniEval helps the team decide which tests to add, update, retire, or deprioritize.'],
]

export default function Home() {
  return <>
    <div className="voice-home">
      <section className="voice-hero shell">
        <div className="voice-hero-copy">
          <p className="voice-eyebrow"><span className="pulse-dot" /> Early access for production Voice AI teams</p>
          <h1>Voice AI changes fast.<br /><em>Your evaluations should keep up.</em></h1>
          <p className="voice-lede">VaaniEval helps teams investigate production voice-agent failures and keep evaluation coverage current as their agents, prompts, tools, and workflows evolve.</p>
          <div className="voice-hero-actions">
            <a className="voice-button" href="#design-partner">Apply for design partner access <span aria-hidden="true">→</span></a>
            <GitHubCta className="voice-text-link" event="github_star_hero_click">Explore the open source project <span aria-hidden="true">↗</span></GitHubCta>
          </div>
          <p className="voice-hero-note">Built with production Voice AI teams. Shaped through active design partnerships.</p>
        </div>

        <div className="voice-console" aria-label="Illustration of a Voice AI investigation workspace">
          <div className="console-grid" />
          <div className="console-topbar"><span>Production investigation</span><span className="console-live"><i /> Live signal</span></div>
          <div className="console-call">
            <div className="call-heading"><span className="call-avatar">V</span><div><strong>Appointment agent</strong><small>Call 8c21 · 04:38</small></div><b>Needs review</b></div>
            <div className="waveform" aria-hidden="true">{Array.from({ length: 42 }, (_, index) => <i key={index} />)}</div>
            <div className="call-tags"><span>Interruption</span><span>Tool fallback</span><span>Latency spike</span></div>
          </div>
          <div className="console-path"><span>Agent config changed</span><i /><i /><i /><b>Coverage review</b></div>
          <div className="console-card console-card-left"><small>Observed behavior</small><strong>Fallback path changed</strong><p>New production pattern after the latest release.</p></div>
          <div className="console-card console-card-right"><small>Suggested next step</small><strong>Review evaluation coverage</strong><p>Check whether the fallback scenario is represented.</p></div>
          <p className="console-footnote">A voice-native view of what changed, what happened, and what to investigate next.</p>
        </div>
      </section>

      <section className="voice-statement"><div className="shell">
        <p className="voice-eyebrow">The problem</p>
        <h2>Voice AI is not text AI with audio added.</h2>
        <p>Production failures can hide in timing, interruptions, speech recognition, tool behavior, conversation flow, and the outcome a caller actually receives. Yet evaluation workflows often become stale as the agent changes.</p>
      </div></section>

      <section className="voice-section shell voice-signals">
        <div className="section-copy"><p className="voice-eyebrow">Voice-first observability</p><h2>See the call behind the failure.</h2><p>Move from a production signal to the conversation, voice behavior, and system context needed to make a confident decision.</p></div>
        <div className="signal-list">{signals.map(([title, description], index) => <article key={title}>
          <span className="signal-index">0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div><span className="signal-arrow" aria-hidden="true">↗</span>
        </article>)}</div>
      </section>

      <section className="voice-loop-section"><div className="shell">
        <div className="voice-loop-heading"><div><p className="voice-eyebrow">Self-healing evaluations</p><h2>Keep quality coverage aligned with the agent you actually have.</h2></div><p>Small teams should not have to rebuild their evaluation suite every time the product changes.</p></div>
        <div className="voice-loop">{loop.map(([number, title, description]) => <article key={number}><span>{number}</span><div className="loop-line" /><h3>{title}</h3><p>{description}</p></article>)}</div>
        <p className="voice-disclaimer">VaaniEval is being developed with design partners. Recommendations should remain reviewable by the team responsible for the agent.</p>
      </div></section>

      <section className="voice-section shell voice-fit">
        <div className="section-copy"><p className="voice-eyebrow">Who this is for</p><h2>For teams where a bad call is a product problem.</h2><p>You are shipping Voice AI into a workflow your customers depend on. You need more than a generic dashboard or a static simulation suite.</p></div>
        <div className="fit-grid"><article><span>For</span><h3>Production Voice AI products</h3><p>Teams building customer-facing agents for high-consequence workflows.</p></article><article><span>For</span><h3>Fast-moving technical teams</h3><p>Teams changing agents, tools, prompts, and policies without time to maintain brittle coverage by hand.</p></article><article className="fit-muted"><span>Not initially for</span><h3>Simple agent experiments</h3><p>Teams that only need basic call scores or a one-off reporting dashboard.</p></article></div>
      </section>

      <section className="design-partner-section" id="design-partner"><div className="shell design-partner-grid">
        <div><p className="voice-eyebrow">Design partner access</p><h2>Help define the quality layer for production Voice AI.</h2><p>We are working closely with a small group of teams building Voice AI products. Apply if evaluation maintenance or production debugging is slowing your team down.</p><ul><li>Direct access to the founder</li><li>Influence over product direction</li><li>Built around a real production workflow</li></ul></div>
        <WaitlistForm />
      </div></section>

      <section className="voice-closing shell"><p className="voice-eyebrow">Start with the real problem</p><h2>Build Voice AI with a quality system that evolves with it.</h2><div><a className="voice-button" href="#design-partner">Apply for design partner access <span aria-hidden="true">→</span></a><Link className="voice-text-link" href="/open-source">View the open-source project <span aria-hidden="true">↗</span></Link></div></section>
    </div>
  </>
}
