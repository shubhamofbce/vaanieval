import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { BookingButton } from '@/components/BookingButton'
import { GitHubCta } from '@/components/GitHubCta'
import { TrackedLink } from '@/components/TrackedLink'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Self-hosted voice AI evaluation',
  description: 'Self-host VaaniEval to evaluate production voice-agent calls with conversation evidence, task completion, intent understanding, and quality trends.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'VaaniEval — Self-hosted voice AI evaluation',
    description: 'Evaluate production voice-agent conversations with evidence, scorecards, and quality trends in infrastructure you control.',
    url: '/',
  },
}

const dashboardScreenshot = 'https://raw.githubusercontent.com/shubhamofbce/vaanieval/main/docs/assets/screenshots/dashboard-analytics.png'
const conversationScreenshot = 'https://raw.githubusercontent.com/shubhamofbce/vaanieval/main/docs/assets/screenshots/conversation-detail.png'

const scorecard = [
  ['Task completion', 'Did the customer reach the intended outcome?', '82'],
  ['Intent understanding', 'Did the agent understand what the caller needed?', '76'],
  ['Required information', 'Did it capture what the workflow required?', '91'],
  ['Human-like delivery', 'Did the conversation feel clear and natural?', '88'],
]

export default function Home() {
  return <>
    <section className="hero hero-repositioned shell">
      <div className="hero-copy">
        <p className="eyebrow">Source available · Voice-agent evaluation</p>
        <h1>Know how your voice agents perform—on infrastructure you control.</h1>
        <p className="lede">Import real production calls, evaluate the outcomes platform dashboards miss, and keep every score connected to the conversation evidence behind it.</p>
        <div className="hero-actions">
          <div className="hero-primary-actions">
            <BookingButton event="calendar_booking_hero_open">Book a demo</BookingButton>
            <TrackedLink className="button button-secondary" href={siteConfig.appUrl} event="hosted_app_hero_click">Try the app</TrackedLink>
          </div>
          <GitHubCta className="text-link hero-star-link" event="github_star_hero_click">Star <span aria-hidden="true">→</span></GitHubCta>
        </div>
        <p className="microcopy">Proprietary license · Permission required to use · ElevenLabs, Vapi, and Bolna imports</p>
      </div>
      <div className="hero-illustration-gif">
        <img
          src="https://raw.githubusercontent.com/shubhamofbce/vaanieval/main/docs/assets/screenshots/vaanieval-scores.gif"
          alt="VaaniEval voice AI evaluation workspace showcasing overall score ring gauge, evaluation metrics, and audio transcript review"
        />
      </div>
    </section>

    <section className="demo-section shell" aria-labelledby="demo-title">
      <div className="section-intro">
        <p className="eyebrow">Product walkthrough</p>
        <h2 id="demo-title">See the VaaniEval review workflow in action.</h2>
        <p className="lede-small">Watch a short product demo to see how conversations, quality scores, and supporting evidence come together in one review workspace.</p>
      </div>
      <div className="demo-video-frame">
        <iframe
          src="https://www.youtube.com/embed/VpEAK7jZ5EI"
          title="VaaniEval product demo"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </section>

    <section className="metric-contrast"><div className="shell contrast-grid">
      <div><p className="eyebrow">The reporting gap</p><h2>Your voice platform tells you what happened. VaaniEval tells you whether it worked.</h2></div>
      <div className="contrast-cards">
        <article><span className="card-label">Platform metrics</span><ul><li>Call volume</li><li>Call duration</li><li>Completed calls</li></ul><p>Helpful operational signals, but they cannot show whether the customer got the right result.</p></article>
        <article className="contrast-primary"><span className="card-label">Conversation quality</span><ul><li>Task completion</li><li>Intent understanding</li><li>Evidence behind every score</li></ul><p>Score meaningful behaviors, then inspect the exact call and evaluator rationale behind a result.</p></article>
      </div>
    </div></section>

    <section className="section shell score-section">
      <div className="section-intro"><p className="eyebrow">A practical production scorecard</p><h2>Measure the behaviors that decide whether a call was actually good.</h2><p className="lede-small">VaaniEval starts with a focused evaluator-backed scorecard. Each result is paired with a rationale and conversation evidence, so it is a starting point for review—not an unexplained number.</p><Link className="text-link" href="/resources/evaluation-metrics">Explore evaluation metrics <span aria-hidden="true">→</span></Link></div>
      <div className="score-grid">{scorecard.map(([title, question, score]) => <article key={title}><div><span className="score-ring">{score}</span><span className="score-out-of">/100</span></div><h3>{title}</h3><p>{question}</p></article>)}</div>
      <aside className="roadmap-card"><span>Design-partner roadmap</span><p><strong>Bring your own criteria</strong> or let an evaluator suggest a first rubric for your workflow.</p><Link href="/design-partners">Help shape it <span aria-hidden="true">→</span></Link></aside>
    </section>

    <section className="section shell run-options">
      <div className="section-intro"><p className="eyebrow">Choose your path</p><h2>Choose how to run VaaniEval.</h2><p className="lede-small">Start in the hosted workspace or request permission to deploy the source-available project in infrastructure your team manages.</p></div>
      <div className="run-options-grid">
        <article>
          <p className="card-kicker">Hosted app</p>
          <h3>Try the managed workspace.</h3>
          <p>Begin in the VaaniEval app at app.vaanieval.com and follow the sign-in flow to get started.</p>
          <TrackedLink className="button" href={siteConfig.appUrl} event="hosted_app_run_choice_click">Try the app</TrackedLink>
        </article>
        <article>
          <p className="card-kicker">Self-hosted</p>
          <h3>Deploy it in your own infrastructure.</h3>
          <p>Inspect the source and request written permission before deploying the project in infrastructure your team manages.</p>
          <div className="inline-links">
            <Link className="text-link" href="/open-source">Review source and license terms <span aria-hidden="true">→</span></Link>
            <GitHubCta className="text-link" event="github_star_run_choice_click">View the repository <span aria-hidden="true">→</span></GitHubCta>
            <a className="text-link" href="https://github.com/shubhamofbce/vaanieval/blob/main/DEPLOYMENT.md" target="_blank" rel="noreferrer">Read deployment guidance <span aria-hidden="true">→</span></a>
          </div>
        </article>
      </div>
    </section>

    <section className="section split deployment-section shell">
      <div><p className="eyebrow">Deploy where you work</p><h2>Run the evaluation loop in infrastructure you control.</h2><p className="lede-small">VaaniEval can be self-hosted with prior written permission. Choose the environment, database, voice-provider connection, and evaluator provider that fit your team’s workflow.</p><div className="inline-links"><Link className="text-link" href="/open-source">Review source and license terms <span aria-hidden="true">→</span></Link><a className="text-link" href="mailto:shubham@vaanieval.com">Request permission <span aria-hidden="true">→</span></a></div></div>
      <ol className="steps steps-four"><li><span>1</span><div><b>Import real calls</b><p>Bring in production conversations from supported providers.</p></div></li><li><span>2</span><div><b>Evaluate behavior</b><p>Score the parts of a call that define its quality.</p></div></li><li><span>3</span><div><b>Inspect evidence</b><p>Review transcript, available audio, and evaluator rationale together.</p></div></li><li><span>4</span><div><b>Improve and verify</b><p>Check new conversations after an agent change.</p></div></li></ol>
    </section>

    <section className="section proof-section"><div className="shell">
      <div className="section-intro proof-intro"><p className="eyebrow">Evidence, not just dashboards</p><h2>Move from a trend to the call that explains it.</h2><p className="lede-small">Find weak quality signals across an agent, then open the conversation, scores, and supporting evidence needed to decide what to fix.</p></div>
      <div className="proof-grid">
        <article className="proof-card"><div className="screenshot-frame dashboard-frame"><img src={dashboardScreenshot} alt="VaaniEval dashboard showing evaluation health, metric scores, and quality trends" /></div><h3>Find the weakest behavior first</h3><p>Review quality trends across agents and time ranges instead of relying only on call counts.</p></article>
        <article className="proof-card proof-card-offset"><div className="screenshot-frame conversation-frame"><img src={conversationScreenshot} alt="VaaniEval conversation detail with an evaluation score, metric results, rationale, and transcript" /></div><h3>Keep the evidence attached</h3><p>Move directly from an aggregate score to the transcript, available audio, and evaluator rationale behind it.</p></article>
      </div>
    </div></section>
    <Cta />
  </>
}
