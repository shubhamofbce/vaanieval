import type { Metadata } from 'next'
import Link from 'next/link'
import { BookingButton } from '@/components/BookingButton'
import { ProductionOverview } from '@/components/ProductionOverview'
import { Reveal } from '@/components/Motion'
import { FailureChain } from '@/components/FailureChain'
import { ProductDemoVideo } from '@/components/ProductDemoVideo'
import { TrackedLink } from '@/components/TrackedLink'
import { homeFaqs, siteConfig, supportedStack } from '@/lib/site'

export const metadata: Metadata = {
  title: { absolute: 'Voice AI Observability and Evaluation | VaaniEval' },
  description: 'Monitor, review, replay, and evaluate voice agents across production conversations. Deploy VaaniEval inside your VPC, cloud account, or on-premises environment.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Voice AI Observability and Evaluation | VaaniEval',
    description: 'Find weak voice-agent calls, review the evidence, and evaluate changes inside infrastructure you control.',
    url: '/',
  },
}

// The demo root is the calls view: the call list on the left with one call
// already open, so a first-time visitor lands on the concrete artefact — audio,
// transcript and the turn that failed — rather than on fleet aggregates that
// mean little before they have seen a single call. The dashboard is one click
// away in the sidebar.
const LIVE_DEMO_URL = new URL('/', siteConfig.liveDemoUrl).toString()

const capabilities = [
  {
    id: 'observe',
    number: '01',
    eyebrow: 'Call observability',
    title: 'Review every conversation in context.',
    copy: 'Bring production recordings, transcripts, outcomes, and available provider metadata into one review workspace. Move from a weak aggregate score to the exact call and evidence behind it.',
    items: ['Synchronized recording and waveform when available', 'Turn-by-turn transcript review', 'Provider outcomes and call metadata', 'Evaluation rationale linked to the conversation'],
    href: '/voice-agent-qa',
    link: 'Explore production QA',
    status: 'Available today',
  },
  {
    id: 'monitoring',
    number: '02',
    eyebrow: 'Production monitoring',
    title: 'See where quality is moving.',
    copy: 'Track QA coverage, pass rate, quality scores, review queues, and agent-level trends. Daily summaries can reach email or Slack, while missing provider outcomes remain visible instead of being counted as success.',
    items: ['Priority review queue', 'Score and pass-rate trends', 'Agent-level quality breakdown', 'Daily email and Slack summaries'],
    href: '/resources/voice-agent-qa-checklist',
    link: 'Use the production QA checklist',
    status: 'Available today',
    note: 'Continuous ingestion alerts and richer turn-level latency reporting are still being developed.',
  },
  {
    id: 'evaluation',
    number: '03',
    eyebrow: 'Evaluation and experiments',
    title: 'Evaluate the next change before it spreads.',
    copy: 'Turn production failures into stable evaluation criteria. Test versioned rubrics on real conversations, compare candidate stacks through offline replay or shadow runs, and keep human review for disputed or high-impact cases.',
    items: ['Versioned evaluation rubrics', 'Evidence-backed scorecards', 'Offline replay and shadow comparison', 'Human review for uncertain results'],
    href: '/voice-ai-evaluation',
    link: 'Explore evaluation workflows',
    status: 'Available today',
  },
  {
    id: 'security',
    number: '04',
    eyebrow: 'Customer-controlled data plane',
    title: 'Keep voice data under your control.',
    copy: 'Run VaaniEval on-premises, in your VPC, or in your cloud account. You choose storage, retention, network policy, credentials, and the approved routes used when an external model provider must receive evaluation inputs.',
    items: ['Customer-controlled deployment and storage', 'Retention and deletion policies you operate', 'Encrypted provider credentials', 'Explicit provider routing and optional redaction'],
    href: '/deployment',
    link: 'Review security architecture',
    status: 'Deployment-specific',
  },
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
          <p className="eyebrow"><i /> The reliability platform for Voice AI</p>
          <h1>Know what happened in every voice-agent call. <span>Improve what happens next.</span></h1>
          <p className="lede">Review production conversations, find failures, monitor quality trends, and evaluate model, prompt, or rubric changes before broader rollout, inside infrastructure you control.</p>
          <div className="actions">
            <TrackedLink className="button" href={LIVE_DEMO_URL} event="live_demo_home_hero" target="_blank" rel="noopener">Open the live demo <span aria-hidden="true">→</span></TrackedLink>
            <BookingButton className="button button-secondary" event="calendar_booking_home_hero_open">Book a call <span aria-hidden="true">↗</span></BookingButton>
            <Link className="quiet-link" href="#platform">Explore the platform <span aria-hidden="true">↓</span></Link>
          </div>
          <p className="hero-assure-line">Real captured calls · No signup · Nothing to install</p>
        </div>
        <ProductionOverview />
      </div>
    </section>

    <section className="workflow-strip" aria-label="VaaniEval workflow">
      <div className="shell">
        <p>From production failure to verified improvement</p>
        <ol><li>Detect</li><li>Investigate</li><li>Evaluate</li><li>Improve</li><li>Monitor</li></ol>
      </div>
    </section>

    <section className="product-demo" aria-labelledby="product-demo-title">
      <div className="shell product-demo-layout">
        <div className="product-demo-copy">
          <p className="eyebrow"><i /> See the workflow</p>
          <h2 id="product-demo-title">Watch the product walkthrough.</h2>
          <p>See how a production call moves from evidence to a reviewable score and next action.</p>
          <div className="product-demo-actions">
            <TrackedLink className="button" href={LIVE_DEMO_URL} event="live_demo_home_video" target="_blank" rel="noopener">Open the live demo <span aria-hidden="true">→</span></TrackedLink>
            <BookingButton className="button button-secondary" event="calendar_booking_home_video_open">Book a call <span aria-hidden="true">↗</span></BookingButton>
          </div>
          <p className="product-demo-note">Bring one recurring voice-agent failure. We will map the evidence and the next evaluation step together.</p>
        </div>
        <ProductDemoVideo videoId="IaTRkQmM2VU" />
      </div>
    </section>

    <section className="capability-section" id="platform">
      <div className="shell">
        <div className="section-intro capability-intro">
          <p className="eyebrow"><i /> One production QA loop</p>
          <h2>See the problem, understand the evidence, and verify the fix.</h2>
          <p>VaaniEval connects conversation review, production quality monitoring, and evaluation without asking you to move sensitive call data into another vendor-hosted data plane.</p>
        </div>
        <div className="capability-list">
          {capabilities.map((capability, index) => <Reveal as="article" key={capability.id} delay={index * 50}>
            <div className="capability-number">{capability.number}</div>
            <div className="capability-copy">
              <div className="capability-heading">
                <p>{capability.eyebrow}</p>
                <span data-status={capability.status}>{capability.status}</span>
              </div>
              <h3>{capability.title}</h3>
              <p>{capability.copy}</p>
              <Link className="text-link" href={capability.href}>{capability.link} <span aria-hidden="true">→</span></Link>
            </div>
            <div className="capability-details">
              <ul>{capability.items.map(item => <li key={item}>{item}</li>)}</ul>
              {capability.note && <p className="capability-note">Roadmap boundary: {capability.note}</p>}
            </div>
          </Reveal>)}
        </div>
      </div>
    </section>

    <section className="compare-section" id="investigate">
      <div className="shell compare-layout">
        <div className="compare-copy">
          <p className="eyebrow"><i /> Evidence before averages</p>
          <h2>Trace a weak outcome back to the conversation.</h2>
          <p>Aggregate trends tell you where quality moved. The call recording, transcript, provider metadata, and evaluator rationale help explain what to fix next.</p>
          <div className="evidence-steps">
            <div><span>01</span><p><strong>Find the call</strong> from the priority review queue.</p></div>
            <div><span>02</span><p><strong>Review the evidence</strong> next to the available recording and transcript.</p></div>
            <div><span>03</span><p><strong>Test the change</strong> against the same success criteria.</p></div>
          </div>
        </div>
        <div className="compare-visual">
          <FailureChain />
          <p className="visual-boundary">This trace illustrates a full voice-agent failure path. The depth of timing and provider metadata available in production depends on what each connected provider exposes.</p>
        </div>
      </div>
    </section>

    <section className="residency" id="deployment">
      <div className="shell residency-layout">
        <div>
          <p className="eyebrow"><i /> Security through architecture</p>
          <h2>Run evaluation where your conversations already live.</h2>
          <p>Deploy on-premises, in your VPC, or in your cloud account. Calls and results stay in storage you control. Hosted model evaluation uses only the egress routes and inputs you approve.</p>
          <Link className="button button-light" href="/deployment">Review security architecture <span aria-hidden="true">→</span></Link>
          <p className="section-note">Self-hosting gives you control, but it also makes your team responsible for capacity, upgrades, backups, access policy, and incident response.</p>
        </div>
        <div className="residency-visual">
          <figure className="topology" aria-label="Deployment topology: production calls and VaaniEval services run inside your environment, with an approved egress route to model endpoints when required.">
            <figcaption>Customer-controlled data plane</figcaption>
            <div className="topo-boundary">
              <div className="topo-row">
                <span className="topo-node">Production calls</span>
                <span className="topo-link" aria-hidden="true"><i /></span>
                <span className="topo-node accent">VaaniEval services</span>
                <span className="topo-link" aria-hidden="true"><i /></span>
                <span className="topo-node">Your storage</span>
              </div>
            </div>
            <span className="topo-egress" aria-hidden="true"><i /></span>
            <p className="topo-out">Approved model endpoints <em>egress you configure</em></p>
          </figure>
          <div className="security-proof-grid">
            <div><strong>Storage</strong><span>Your database and object store</span></div>
            <div><strong>Retention</strong><span>Your deletion policy</span></div>
            <div><strong>Credentials</strong><span>Encrypted at rest</span></div>
            <div><strong>Provider egress</strong><span>Explicit and reviewable</span></div>
          </div>
        </div>
      </div>
    </section>

    <section className="stackfit">
      <div className="shell">
        <div className="section-intro">
          <p className="eyebrow"><i /> Connect what you already run</p>
          <h2>Start with the platforms already handling your calls.</h2>
          <p>Connector depth varies because providers expose different recordings, transcripts, timestamps, and outcome fields. We confirm the available evidence before implementation.</p>
        </div>
        <ul className="stack-list">{supportedStack.map(item => <li key={item.name}>
          <strong>{item.name}</strong>
          <em className={item.status === 'Available today' ? 'now' : ''}>{item.status}</em>
        </li>)}</ul>
        <p className="section-note"><Link className="text-link" href="/integrations/elevenlabs">Review current integrations</Link>, or request another connector during onboarding.</p>
      </div>
    </section>

    <section className="faq">
      <div className="shell faq-layout">
        <div>
          <p className="eyebrow"><i /> Questions</p>
          <h2>What production Voice AI teams ask first.</h2>
          <p className="lede-small">Clear boundaries make a better security and product review.</p>
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
          <p className="eyebrow"><i /> Talk to us</p>
          <h2>Bring one recurring production failure. Map the path to a verified fix.</h2>
          <p>In 30 minutes, we review your current call evidence, evaluation criteria, and deployment constraints. No call upload is required.</p>
          <div className="partner-points"><span>Founder-led</span><span>Product and architecture review</span><span>No call upload required</span></div>
          <BookingButton className="button button-light" event="calendar_booking_home_footer_open">Book a call <span aria-hidden="true">↗</span></BookingButton>
          <p className="closing-note">VaaniEval is early. We will tell you where the current product fits and where it does not.</p>
        </div>
      </div>
    </section>

    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
  </div>
}
