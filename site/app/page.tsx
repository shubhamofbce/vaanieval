import type { Metadata } from 'next'
import Link from 'next/link'
import { BookingButton } from '@/components/BookingButton'
import { LiveBenchmark } from '@/components/LiveBenchmark'
import { Reveal } from '@/components/Motion'
import { FailureChain } from '@/components/FailureChain'
import { WaitlistForm } from '@/components/WaitlistForm'
import { homeFaqs, proofStats, siteConfig, statsFootnote, supportedStack } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Private voice AI evaluation infrastructure',
  description: 'Choose the voice stack that wins on your calls. Replay production calls across STT, LLM, and TTS models inside your own VPC, and catch critical errors before rollout.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'VaaniEval | Choose the voice stack that wins on your calls',
    description: 'Private voice AI evaluation infrastructure. Benchmark STT, LLM, and TTS models on real production calls without handing customer conversations to another SaaS platform.',
    url: '/',
  },
}

const steps = [
  { n: '1', title: 'Select representative calls', copy: 'Sample by language, accent, noise, and risk. They stay in storage you control.' },
  { n: '2', title: 'Replay each candidate', copy: 'Run identical calls through your current stack and every candidate stack.' },
  { n: '3', title: 'Promote on evidence', copy: 'Gate rollout on critical errors, latency, cost, and task success.' },
]

const metrics = [
  { k: 'Critical errors', v: 'Names, amounts, dates, and IDs — separated from harmless word-error noise.' },
  { k: 'Latency people feel', v: 'Endpointing, time-to-first-audio, and the P95 tail, not the average.' },
  { k: 'Task & tool success', v: 'Whether the agent reached the right decision and called the right tool.' },
  { k: 'Cost per resolved call', v: 'Provider spend measured against outcomes on the same scenarios.' },
  { k: 'Regression by cohort', v: 'Movement per language, accent, and channel. Averages hide the cohort that breaks.' },
]

const residency = [
  ['Deployment', 'On-premises, your VPC, or your own cloud account. The data plane runs where your calls already live.'],
  ['Storage & retention', 'Calls, transcripts, traces, and results stay in your object store, under your deletion policy.'],
  ['Access & credentials', 'Your network policy, your identity controls, your secret manager.'],
  ['Provider routing', 'External model calls only through egress routes you approve, with optional redaction.'],
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
      <div className="hero-grid-lines" aria-hidden="true" />
      <div className="shell hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><i /> {siteConfig.tagline}</p>
          <h1>Public benchmarks rank models. <span>See which stack wins on your calls.</span></h1>
          <p className="lede">Replay production calls across STT, LLM, and TTS candidates &mdash; in your VPC or on-prem. Catch the critical errors before rollout.</p>
          <div className="actions">
            <BookingButton className="button" event="calendar_booking_home_hero_open">Book a benchmark review <span aria-hidden="true">↗</span></BookingButton>
          </div>
          <p className="hero-assure-line">Your VPC or on-prem · Your storage · No VaaniEval data plane</p>
        </div>
        <LiveBenchmark />
      </div>
    </section>

    <section className="trust-strip">
      <div className="shell trust-inner">
        <p className="trust-title">Trusted by voice agent providers</p>
        <div className="stat-row">
          {proofStats.map(stat => <div key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>)}
        </div>
        <p className="stat-footnote">{statsFootnote}</p>
      </div>
    </section>

    <section className="compare-section">
      <div className="shell compare-layout">
        <div className="compare-copy">
          <p className="eyebrow"><i /> Beyond word error rate</p>
          <h2>One wrong digit becomes a wrong customer outcome.</h2>
          <p>Trace a failure from audio to transcription, tool call, and spoken response &mdash; before it reaches production.</p>
          <dl className="metric-rows">{metrics.map((item, index) => <Reveal key={item.k} delay={index * 50}>
            <dt>{item.k}</dt>
            <dd>{item.v}</dd>
          </Reveal>)}</dl>
        </div>
        <div className="compare-visual">
          <FailureChain />
          <div className="inline-cta">
            <p>See this comparison on your own call data.</p>
            <BookingButton className="button button-small" event="calendar_booking_compare_open">Book a benchmark review <span aria-hidden="true">↗</span></BookingButton>
          </div>
        </div>
      </div>
    </section>

    <section className="process">
      <div className="shell">
        <div className="section-intro">
          <p className="eyebrow"><i /> How it works</p>
          <h2>Turn production calls into a private benchmark.</h2>
        </div>
        <div className="process-rail">{steps.map((step, index) => <Reveal as="article" key={step.n} delay={index * 70}>
          <span>{step.n}</span>
          <h3>{step.title}</h3>
          <p>{step.copy}</p>
        </Reveal>)}</div>
        <div className="mode-split">
          <Reveal as="article"><h3>Offline replay</h3><p>Compare candidates on historical calls after every model or prompt change.</p></Reveal>
          <Reveal as="article" delay={80}><h3>Real-time shadow</h3><p>Test on live conditions without letting candidates answer customers.</p></Reveal>
        </div>
      </div>
    </section>

    <section className="residency" id="deployment">
      <div className="shell residency-layout">
        <div>
          <p className="eyebrow"><i /> Private deployment</p>
          <h2>Benchmark production calls without uploading them to another eval SaaS.</h2>
          <p>Deploy on-premises, in your VPC, or in your own cloud account. Calls and results stay in your storage. Hosted model evaluation uses only the egress routes you approve.</p>
          <BookingButton className="button button-light" event="calendar_booking_residency_open">Review your deployment fit <span aria-hidden="true">↗</span></BookingButton>
          <p className="section-note">Prefer to read first? <Link className="text-link" href="/deployment">See the deployment architecture</Link>.</p>
        </div>
        <div className="residency-visual">
          <figure className="topology" aria-label="Deployment topology: production calls and VaaniEval workers run inside your environment, with a single approved egress route to model endpoints.">
            <figcaption>Your environment</figcaption>
            <div className="topo-boundary">
              <div className="topo-row">
                <span className="topo-node">Production calls</span>
                <span className="topo-link" aria-hidden="true"><i /></span>
                <span className="topo-node accent">VaaniEval workers</span>
                <span className="topo-link" aria-hidden="true"><i /></span>
                <span className="topo-node">Your storage</span>
              </div>
            </div>
            <span className="topo-egress" aria-hidden="true"><i /></span>
            <p className="topo-out">Approved model endpoints <em>egress you control</em></p>
          </figure>
          <dl className="residency-list">{residency.map(([term, copy]) => <div key={term}><dt>{term}</dt><dd>{copy}</dd></div>)}</dl>
        </div>
      </div>
    </section>

    <section className="stackfit">
      <div className="shell">
        <div className="section-intro">
          <p className="eyebrow"><i /> Connect what you already run</p>
          <h2>Works with the stack already handling your calls.</h2>
        </div>
        <ul className="stack-list">{supportedStack.map(item => <li key={item.name}>
          <strong>{item.name}</strong>
          <em className={item.status === 'Available today' ? 'now' : ''}>{item.status}</em>
        </li>)}</ul>
        <p className="section-note">Anything else is built as a connector during onboarding, and we tell you which case you are in before you commit. <Link className="text-link" href="/integrations/elevenlabs">See integrations</Link>.</p>
        <div className="inline-cta">
          <p>Not sure your platform is covered? We&rsquo;ll confirm in the first 10 minutes.</p>
          <BookingButton className="button button-small" event="calendar_booking_stackfit_open">Book a benchmark review <span aria-hidden="true">↗</span></BookingButton>
        </div>
      </div>
    </section>

    <section className="faq">
      <div className="shell faq-layout">
        <div>
          <p className="eyebrow"><i /> Questions</p>
          <h2>What teams ask before the first benchmark.</h2>
          <p className="lede-small">If your question is not here, it is a good first question for the review.</p>
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
          <p className="eyebrow"><i /> 30-minute benchmark review</p>
          <h2>Bring one model decision. Leave with the benchmark plan to resolve it.</h2>
          <p>In 30 minutes we map the calls, metrics, and deployment needed to compare your candidates. No call upload required.</p>
          <div className="partner-points"><span>Founder-led</span><span>Architecture review</span><span>No call upload required</span></div>
          <BookingButton className="button button-light" event="calendar_booking_home_footer_open">Book the benchmark review <span aria-hidden="true">↗</span></BookingButton>
          <p className="closing-note">No slide deck. We will tell you if VaaniEval is the wrong fit.</p>
        </div>
        <div className="form-alt">
          <details className="form-alt-disclosure">
            <summary>Can&rsquo;t find a suitable time?</summary>
            <WaitlistForm />
          </details>
        </div>
      </div>
    </section>

    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
  </div>
}
