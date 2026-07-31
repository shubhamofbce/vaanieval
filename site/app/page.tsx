import type { Metadata } from 'next'
import Link from 'next/link'
import { GitHubCta } from '@/components/GitHubCta'
import { WaitlistForm } from '@/components/WaitlistForm'

export const metadata: Metadata = {
  title: 'Evaluation debt for production Voice AI',
  description: 'VaaniEval helps Voice AI teams identify when a changing agent has made evaluation coverage stale, redundant, or incomplete.',
  alternates: { canonical: '/' },
  openGraph: { title: 'VaaniEval | Evaluation debt for Voice AI', description: 'Your agent changed. Which tests are now wrong?', url: '/' },
}

const evidence = [
  ['00:04.8', 'Caller interrupts', 'Barge-in'],
  ['00:06.1', 'Agent repeats policy', 'Behavior shift'],
  ['00:08.3', 'Scheduling fallback', 'Tool event'],
  ['00:10.2', 'Caller drops', 'Outcome'],
]

export default function Home() {
  return <div className="drift-home">
    <section className="drift-hero shell">
      <div className="drift-copy">
        <p className="drift-kicker"><i /> The quality system for Voice AI</p>
        <h1>Every voice agent change creates <span>evaluation debt.</span></h1>
        <p className="drift-lede">VaaniEval shows where production behavior moved, which tests no longer represent your agent, and what coverage to review next.</p>
        <div className="drift-actions"><a href="#design-partner" className="drift-button">Build with us <span>↗</span></a><GitHubCta className="drift-link" event="github_star_hero_click">View the open source project <span>↗</span></GitHubCta></div>
        <p className="drift-caption">For technical teams operating Voice AI in production.</p>
      </div>
      <CoverageDrift />
    </section>

    <section className="debt-statement"><div className="shell">
      <p className="drift-kicker">The failure mode nobody owns</p>
      <div><h2>A passing suite can still be the wrong suite.</h2><p>Prompts, models, tools, and flows change constantly. The tests that once protected an agent can quietly become stale, redundant, or incomplete. Your dashboard will show a failure. It will not tell you whether your coverage is still valid.</p></div>
    </div></section>

    <section className="drift-process shell">
      <div className="process-intro"><p className="drift-kicker">A living evaluation system</p><h2>From changed behavior to a coverage decision.</h2><p>Not another score. A reviewable path from an agent release to the tests that matter now.</p></div>
      <div className="process-rail"><article><span>01</span><h3>Detect the change</h3><p>Follow the agent changes and production behavior worth investigating.</p></article><article><span>02</span><h3>Classify coverage</h3><p>Surface coverage that may be missing, stale, redundant, or still representative.</p></article><article><span>03</span><h3>Update with context</h3><p>Use the call, trace, and outcome to decide what belongs in the suite.</p></article></div>
    </section>

    <section className="trace-section"><div className="shell trace-layout">
      <div className="trace-copy"><p className="drift-kicker">Production context</p><h2>Debug the behavior behind the drift.</h2><p>Voice quality does not live in a transcript alone. Investigate the turn, interruption, timing, tool event, and customer outcome that made a coverage decision necessary.</p><p className="trace-note">Production investigation is the evidence layer. Coverage relevance is the decision layer.</p></div>
      <div className="call-trace" aria-label="Illustrative call trace product preview"><div className="trace-bar"><span>CALL TRACE / PRODUCT PREVIEW</span><b>Review required</b></div><div className="trace-agent"><span>booking-agent</span><small>release v24.9 · fallback branch</small></div><div className="trace-wave">{Array.from({ length: 48 }, (_, index) => <i key={index} />)}</div><div className="trace-events">{evidence.map(([time, event, label]) => <div key={time}><time>{time}</time><span>{event}</span><b>{label}</b></div>)}</div><div className="trace-conclusion"><span>Why this matters</span><strong>Fallback behavior changed after release.</strong><p>Review test coverage for interruption during scheduling recovery.</p></div></div>
    </div></section>

    <section className="fit-section shell"><p className="drift-kicker">Built for teams where the agent is the product</p><div><h2>Quality infrastructure for teams shipping Voice AI into real workflows.</h2><p>For companies building agents that schedule, support, teach, qualify, advise, or resolve. If an agent change can affect a customer outcome, evaluation coverage is product infrastructure.</p></div></section>

    <section id="design-partner" className="drift-cta"><div className="shell partner-layout"><div><p className="drift-kicker">Design-partner program</p><h2>Stop maintaining yesterday’s evaluation suite.</h2><p>We are building VaaniEval alongside a small number of production Voice AI teams. Bring the release process and call failures that are slowing you down.</p><div className="partner-points"><span>Founder-led implementation</span><span>Shape the product direction</span><span>Built around a real workflow</span></div></div><WaitlistForm /></div></section>

    <section className="drift-footer-call shell"><p>Your agent changed. Your quality system should notice.</p><a href="#design-partner" className="drift-link">Apply to build with us <span>↗</span></a><Link href="/open-source" className="drift-link">Read the architecture <span>↗</span></Link></section>
  </div>
}

function CoverageDrift() {
  return <div className="coverage-drift" aria-label="Product preview showing a release changing evaluation coverage">
    <div className="coverage-head"><span>coverage drift / product preview</span><b>In development</b></div>
    <div className="coverage-deploy"><div><small>RELEASE DIFF</small><strong>booking-agent <em>v24.8 → v24.9</em></strong></div><p><span>prompt</span><span>handoff</span><span>scheduling tool</span></p></div>
    <div className="coverage-map"><span className="map-label">OBSERVED PRODUCTION PATH</span><i className="map-line map-line-a" /><i className="map-line map-line-b" /><i className="map-line map-line-c" /><i className="map-node node-a" /><i className="map-node node-b" /><i className="map-node node-c" /><i className="map-node node-d" /><div className="drift-alert"><small>BEHAVIOR DIVERGENCE</small><strong>Fallback branch appears after release</strong></div></div>
    <div className="coverage-classify"><div className="classify-head"><span>SUITE RELEVANCE</span><b>Needs review</b></div><p><i className="ok" /> Still representative <strong>✓</strong></p><p><i className="warn" /> Possibly stale <strong>!</strong></p><p><i className="warn" /> Missing coverage <strong>!</strong></p><p><i /> Possibly redundant <strong>·</strong></p></div>
    <div className="coverage-bottom"><span>CHANGE DETECTED</span><i /><span>BEHAVIOR REVIEWED</span><i /><span>COVERAGE CLASSIFIED</span></div>
  </div>
}
