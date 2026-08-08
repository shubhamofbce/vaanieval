import type { Metadata } from 'next'
import Link from 'next/link'
import { BookingButton } from '@/components/BookingButton'
import { WaitlistForm } from '@/components/WaitlistForm'
import { homeFaqs, proofStats, siteConfig, stackFit, statsFootnote, trustedBy } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Private voice AI evaluation infrastructure',
  description: 'Find the voice model that works on your calls. Benchmark STT, LLM, and TTS stacks on real production calls inside your own environment, before you change production.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'VaaniEval | Find the voice model that works on your calls',
    description: 'Private voice AI evaluation infrastructure. Benchmark STT, LLM, and TTS models on real production scenarios without handing customer conversations to another SaaS platform.',
    url: '/',
  },
}

const steps = [
  { n: '01', title: 'Connect customer-controlled storage', copy: 'Import approved calls and metadata from your voice platform or object store. Nothing is copied into a vendor environment.' },
  { n: '02', title: 'Define the benchmark', copy: 'Stratify calls by language, accent, noise, use case, outcome, and risk so the set actually represents your traffic.' },
  { n: '03', title: 'Replay or shadow candidates', copy: 'Run identical scenarios through your current stack and every approved STT, LLM, and TTS configuration.' },
  { n: '04', title: 'Approve the production change', copy: 'Inspect regressions, record the decision with its evidence, and stage the rollout instead of guessing.' },
]

const metrics = [
  { title: 'Critical transcription errors', copy: 'Flagged disagreements on names, amounts, dates, locations, and domain terms, separated from harmless word-error noise.' },
  { title: 'Turn latency people feel', copy: 'Endpointing behavior, time-to-first-token, and time-to-first-audio across the latency distribution, not just the average.' },
  { title: 'Task and tool success', copy: 'Whether the agent reached the right decision, called the right tool, and captured the fields the workflow depends on.' },
  { title: 'Cost per resolved call', copy: 'Provider spend measured against outcomes on the same scenarios, so a cheaper model that fails more is visible.' },
  { title: 'Regression by cohort', copy: 'Quality movement broken out by language, accent, channel, and use case, because averages hide the cohort that breaks.' },
]

const stakeholders = [
  { role: 'Model evidence', who: 'For VP of AI and ML engineers', copy: 'The audio, transcript, timing, model output, and the exact point of disagreement behind every number in the comparison.' },
  { role: 'Production risk', who: 'For product and operations leaders', copy: 'The failures that change a customer outcome, ranked by business impact instead of by aggregate accuracy.' },
  { role: 'Data governance', who: 'For CTO, CISO, and procurement', copy: 'Where the data lived, who could reach it, what was retained, and which inputs went to which provider on which run, with the redaction policy applied.' },
]

const residency = [
  ['Deployment', 'On-premises, in your VPC, or in a customer-controlled cloud account. The data plane runs where your calls already live.'],
  ['Storage & retention', 'Calls, transcripts, traces, and results stay in your object store and your database, under your retention and deletion policy.'],
  ['Access & credentials', 'Access follows your network policy and identity controls. Provider credentials stay in your secret manager.'],
  ['Provider routing', 'External model calls happen only through routes you configure, with optional redaction and a per-run record of what was sent.'],
]

export default function Home() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: homeFaqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
  }

  return <div className="home">
    <section className="hero">
      <div className="hero-glow" aria-hidden="true" />
      <div className="shell hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><i /> {siteConfig.tagline}</p>
          <h1>Find the voice model that works on <span>your calls.</span></h1>
          <p className="lede">Benchmark STT, LLM, and TTS stacks on real production calls, inside your own environment. Compare quality, latency, cost, and downstream failures before you change production.</p>
          <p className="pull-line">Public benchmarks rank models. VaaniEval tells you which model works for your calls.</p>
          <div className="actions">
            <BookingButton className="button" event="calendar_booking_home_hero_open">Book a demo <span aria-hidden="true">↗</span></BookingButton>
            <Link className="quiet-link" href="/deployment">See how on-prem evaluation works <span aria-hidden="true">→</span></Link>
          </div>
          <ul className="hero-assurances">
            <li>Customer-controlled deployment</li>
            <li>Customer-controlled retention</li>
            <li>Customer-controlled provider access</li>
          </ul>
        </div>
        <BenchmarkPanel />
      </div>
    </section>

    <section className="trust-strip">
      <div className="shell">
        <p className="trust-title">Trusted by voice agent providers across the globe</p>
        <ul className="trust-logos">{trustedBy.map(item => <li key={item}>{item}</li>)}</ul>
        <p className="trust-note">Deployments span these operations. Named references are shared under NDA during evaluation.</p>
      </div>
    </section>

    <section className="stat-band">
      <div className="shell">
        <div className="stat-grid">
          {proofStats.map(stat => <article key={stat.label}>
            <strong>{stat.value}</strong>
            <b>{stat.label}</b>
            <p>{stat.detail}</p>
          </article>)}
        </div>
        <p className="stat-footnote">{statsFootnote}</p>
      </div>
    </section>

    <section className="problem">
      <div className="shell problem-grid">
        <div>
          <p className="eyebrow"><i /> The model-selection problem</p>
          <h2>The best public benchmark may be the wrong model for your calls.</h2>
        </div>
        <div className="problem-copy">
          <p>A model can top a public leaderboard and still fail on your customers&rsquo; accents, languages, call noise, domain vocabulary, and the details that drive an action: names, amounts, dates, and identifiers.</p>
          <p>Meanwhile the obvious way to find out &mdash; upload a sample of production calls to a hosted evaluation tool &mdash; is exactly what your security team will refuse.</p>
          <p>The decision has to be made on your data. That should not mean giving up control of it.</p>
        </div>
      </div>
    </section>

    <section className="process">
      <div className="shell">
        <div className="section-intro">
          <p className="eyebrow"><i /> How it works</p>
          <h2>Turn production calls into a private model benchmark.</h2>
          <p className="lede-small">Four steps from customer-controlled call storage to a model decision your engineering and security teams can both review.</p>
        </div>
        <div className="process-rail">{steps.map(step => <article key={step.n}>
          <span>{step.n}</span>
          <h3>{step.title}</h3>
          <p>{step.copy}</p>
        </article>)}</div>
        <InlineCta label="Benchmark a model decision on your calls" event="calendar_booking_process_open" />
      </div>
    </section>

    <section className="compare-section">
      <div className="shell compare-layout">
        <div className="compare-copy">
          <p className="eyebrow"><i /> Evidence, not opinions</p>
          <h2>The model with the best error rate can still be the wrong choice.</h2>
          <p>Aggregate accuracy hides the errors that matter. One wrong digit in an amount or an account number becomes a wrong tool call, a wrong confirmation, and a customer complaint.</p>
          <p>VaaniEval shows the turn, the audio, the word-level disagreement, and what happened downstream when the transcript changed.</p>
          <p className="trace-note">Model disagreement is comparative evidence, not ground truth. For high-stakes accuracy claims, pair it with a human-reviewed reference set. We say this in the demo too.</p>
        </div>
        <DisagreementPanel />
      </div>
    </section>

    <section className="shadow-section">
      <div className="shell shadow-layout">
        <div className="section-intro">
          <p className="eyebrow"><i /> Safe rollout</p>
          <h2>Test the replacement before a customer hears it.</h2>
          <p className="lede-small">Two modes, one benchmark. Nothing reaches a caller until the numbers clear your thresholds.</p>
        </div>
        <div className="shadow-grid">
          <article><h3>Offline replay</h3><p>Replay historical calls through candidate stacks for a controlled, repeatable comparison across a large set. Cheap to run, easy to rerun after every provider or prompt change.</p></article>
          <article><h3>Real-time shadow</h3><p>Run candidates alongside live traffic under real network, noise, and interruption conditions, without letting them answer the customer.</p></article>
          <article><h3>Promotion gate</h3><p>Promote only when quality, latency, cost, and critical-error thresholds pass. The decision and its evidence are recorded together.</p></article>
        </div>
        <p className="section-note">Shadow evaluation raises provider spend, and hosted candidates create an egress path. Budgets, rate limits, redaction, and audit logs are part of the deployment design, not a hidden default.</p>
      </div>
    </section>

    <section className="residency" id="deployment">
      <div className="shell residency-layout">
        <div>
          <p className="eyebrow"><i /> Data residency</p>
          <h2>Your data. Your environment. Your control.</h2>
          <p>Deploy VaaniEval on-premises, in your VPC, or in a customer-controlled cloud account. Calls, transcripts, traces, and evaluation results remain in your storage. Provider credentials stay in your secret manager. External model calls happen only through routes you configure.</p>
          <p className="section-note">Data residency here is product architecture, not a certification slide. We would rather be precise about the boundary than claim more than the deployment supports.</p>
          <Link className="button button-light" href="/deployment">Review deployment architecture <span aria-hidden="true">↗</span></Link>
        </div>
        <dl className="residency-list">{residency.map(([term, copy]) => <div key={term}><dt>{term}</dt><dd>{copy}</dd></div>)}</dl>
      </div>
    </section>

    <section className="stackfit">
      <div className="shell">
        <div className="section-intro">
          <p className="eyebrow"><i /> Fits your stack</p>
          <h2>Built around the voice stack you already operate.</h2>
          <p className="lede-small">VaaniEval sits beside your agent platform rather than replacing it. Nothing about your production path changes to run an evaluation.</p>
        </div>
        <div className="stackfit-grid">{stackFit.map(item => <article key={item.title}>
          <h3>{item.title}</h3>
          <p>{item.copy}</p>
        </article>)}</div>
        <p className="section-note">Adapters exist for ElevenLabs, Vapi, and Bolna, plus generic object-storage import. Anything else is built as a connector during onboarding, and we will tell you which case you are in before you commit. <Link className="text-link" href="/integrations/elevenlabs">See integrations</Link>.</p>
      </div>
    </section>

    <section className="outcomes">
      <div className="shell">
        <div className="section-intro">
          <p className="eyebrow"><i /> What you measure</p>
          <h2>Compare the metrics that decide whether a voice stack survives production.</h2>
        </div>
        <div className="outcome-grid">{metrics.map(item => <article key={item.title}>
          <h3>{item.title}</h3>
          <p>{item.copy}</p>
        </article>)}</div>
      </div>
    </section>

    <section className="audience">
      <div className="shell audience-layout">
        <div>
          <p className="eyebrow"><i /> One decision record</p>
          <h2>Give engineering, security, and operations the same evidence.</h2>
          <p className="lede-small">Built for BFSI, healthcare, insurance, telecom, and contact-center teams where voice data is both valuable and sensitive.</p>
          <InlineCta label="Review the deployment with your security team" event="calendar_booking_audience_open" cta="Book an architecture session" />
        </div>
        <div className="audience-list">{stakeholders.map(item => <article key={item.role}>
          <strong>{item.role}</strong>
          <small>{item.who}</small>
          <p>{item.copy}</p>
        </article>)}</div>
      </div>
    </section>

    <section className="faq">
      <div className="shell faq-layout">
        <div>
          <p className="eyebrow"><i /> Questions</p>
          <h2>What teams ask before the first benchmark.</h2>
          <p className="lede-small">If your question is not here, it is a good first question for the demo.</p>
        </div>
        <div className="faq-list">{homeFaqs.map(faq => <details key={faq.question}>
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>)}</div>
      </div>
    </section>

    <section className="closing-cta" id="demo">
      <div className="shell partner-layout">
        <div>
          <p className="eyebrow"><i /> Book a demo</p>
          <h2>Own your benchmark. Control your data.</h2>
          <p>Bring the model decision you are stuck on. In 30 minutes we map your calls to a private benchmark and show how the same evaluation runs inside your environment.</p>
          <div className="partner-points"><span>Founder-led session</span><span>Deployment architecture review</span><span>Your first benchmark plan</span></div>
          <BookingButton className="button button-light" event="calendar_booking_home_footer_open">Pick a time <span aria-hidden="true">↗</span></BookingButton>
          <p className="closing-note">No slide deck. We will tell you if VaaniEval is the wrong fit.</p>
        </div>
        <div className="form-alt">
          <p className="form-alt-label">No suitable time? Send us your requirements.</p>
          <WaitlistForm />
        </div>
      </div>
    </section>

    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
  </div>
}

function InlineCta({ label, event, cta = 'Book a demo' }: { label: string, event: string, cta?: string }) {
  return <div className="inline-cta">
    <p>{label}</p>
    <BookingButton className="button button-small" event={event}>{cta} <span aria-hidden="true">↗</span></BookingButton>
  </div>
}

const benchmarkRows = [
  { model: 'Stack A · current', wer: '11.4%', critical: '6', latency: '1.42s', tone: 'warn' },
  { model: 'Stack B · candidate', wer: '8.1%', critical: '1', latency: '0.91s', tone: 'ok' },
  { model: 'Stack C · candidate', wer: '7.6%', critical: '9', latency: '2.10s', tone: 'bad' },
]

function BenchmarkPanel() {
  return <figure className="panel benchmark-panel">
    <div className="panel-head"><span>private benchmark · 1,000 calls</span><b>Sample data</b></div>
    <div className="panel-meta"><div><small>DATASET</small><strong>collections-hi-en</strong></div><div><small>SCENARIOS</small><strong>Replayed identically</strong></div></div>
    <div className="table-scroll">
      <table className="benchmark-table">
        <thead><tr><th scope="col">Stack</th><th scope="col">WER</th><th scope="col">Critical errors</th><th scope="col">P50 turn</th></tr></thead>
        <tbody>{benchmarkRows.map(row => <tr key={row.model} className={`row-${row.tone}`}>
          <th scope="row">{row.model}</th><td>{row.wer}</td><td>{row.critical}</td><td>{row.latency}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="panel-conclusion">
      <span>WHY IT MATTERS</span>
      <strong>Stack C wins on WER and loses on your calls.</strong>
      <p>Nine of its errors landed on amounts and account numbers, and its turn latency breaks the conversation.</p>
    </div>
    <figcaption>Illustrative evaluation run. Sample data, not a customer result.</figcaption>
  </figure>
}

function DisagreementPanel() {
  return <figure className="panel disagreement-panel">
    <div className="panel-head"><span>turn 14 · 00:48.2</span><b>High risk</b></div>
    <div className="panel-wave" aria-hidden="true">{Array.from({ length: 44 }, (_, index) => <i key={index} />)}</div>
    <div className="transcript-rows">
      <div><small>REFERENCE AUDIO</small><p>&ldquo;Pay four thousand <em>eight</em> hundred and twenty rupees by the twelfth.&rdquo;</p></div>
      <div className="row-ok"><small>STACK B</small><p>Pay 4,820 rupees by the 12th <b>✓</b></p></div>
      <div className="row-bad"><small>STACK C</small><p>Pay 4,<em>2</em>20 rupees by the 12th <b>!</b></p></div>
    </div>
    <div className="downstream">
      <span>DOWNSTREAM EFFECT</span>
      <div className="downstream-chain"><b>STT</b><i /><b>LLM</b><i /><b>Tool call</b><i /><b>TTS</b></div>
      <p>The wrong amount propagated into the payment-link tool call and the spoken confirmation.</p>
    </div>
    <figcaption>Illustrative turn-level comparison. Sample data, not a customer call.</figcaption>
  </figure>
}
