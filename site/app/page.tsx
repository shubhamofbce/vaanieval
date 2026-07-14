import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { GitHubCta } from '@/components/GitHubCta'

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
        <p className="eyebrow">Open-source · Self-hosted voice-agent evaluation</p>
        <h1>Know how your voice agents perform—on infrastructure you control.</h1>
        <p className="lede">Import real production calls, evaluate the outcomes platform dashboards miss, and keep every score connected to the conversation evidence behind it.</p>
        <div className="actions">
          <GitHubCta className="button button-github" event="github_star_hero_click" />
          <Link className="button button-secondary" href="/design-partners">Apply as a design partner</Link>
        </div>
        <p className="microcopy">MIT licensed · Self-hostable · ElevenLabs and Vapi imports</p>
      </div>
      <figure className="hero-product-crop">
        <img src={dashboardScreenshot} alt="VaaniEval dashboard with evaluation health, task completion, intent understanding, and quality trends" />
        <figcaption>Track the quality signals behind your production calls.</figcaption>
      </figure>
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

    <section className="section split deployment-section shell">
      <div><p className="eyebrow">Deploy where you work</p><h2>Run the evaluation loop in infrastructure you control.</h2><p className="lede-small">VaaniEval is MIT-licensed and self-hostable. Choose the environment, database, voice-provider connection, and evaluator provider that fit your team’s workflow.</p><div className="inline-links"><Link className="text-link" href="/open-source">Explore the open-source project <span aria-hidden="true">→</span></Link><a className="text-link" href="https://github.com/shubhamofbce/vaanieval/blob/main/DEPLOYMENT.md">Read deployment guidance <span aria-hidden="true">→</span></a></div></div>
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
