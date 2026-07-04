import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { posts, siteConfig } from '@/lib/site'

const features = [
  ['Conversation evidence', 'Review transcripts, audio, metadata, and evaluation results in one focused workspace.'],
  ['Actionable evaluation', 'Score task completion, unsupported claims, fallback behavior, and operational quality.'],
  ['Production visibility', 'Track quality trends by agent and move from aggregate signals back to individual calls.'],
  ['Provider flexibility', 'Import conversations from ElevenLabs or Vapi and choose how evaluator models are configured.'],
]

export default function Home() { return <>
  <section className="hero shell"><div><p className="eyebrow">Open-source voice AI evaluation</p><h1>Find the production calls your voice agent team needs to fix.</h1><p className="lede">VaaniEval turns real voice-agent conversations into reviewable evidence, quality scores, and clear engineering feedback.</p><div className="actions"><Link className="button" href="/design-partners">Apply for the free pilot</Link><a className="button button-secondary" href={siteConfig.githubUrl}>View on GitHub</a></div><p className="microcopy">Self-hosted · MIT licensed · Built for ElevenLabs and Vapi workflows</p></div><div className="hero-visual"><div className="mock-top"><span></span><span></span><span></span><b>Conversation review</b></div><div className="score-row"><div><small>Task completion</small><strong>86%</strong></div><div><small>Quality trend</small><strong className="good">+12%</strong></div></div><div className="transcript"><p><b>Customer</b> I need to reschedule my appointment.</p><p><b>Agent</b> I can help with that. What day works best?</p></div><div className="finding"><span>Evaluation finding</span><b>Resolved with a clear next step</b></div></div></section>
  <section className="trust-strip"><div className="shell"><span>Built for production workflows using</span><strong>ElevenLabs</strong><strong>Vapi</strong><strong>OpenAI</strong><strong>Anthropic</strong></div></section>
  <section className="section shell"><p className="eyebrow">A tighter QA loop</p><h2>Move from call volume to specific, reviewable failures.</h2><div className="feature-grid">{features.map(([title, copy], i) => <article key={title}><span className="feature-number">0{i + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
  <section className="section split shell"><div><p className="eyebrow">How it works</p><h2>From provider import to verified fix.</h2><p className="lede-small">Keep the evidence attached to every score so reviewers can understand what happened, not only whether a metric passed.</p></div><ol className="steps"><li><span>1</span><div><b>Import production calls</b><p>Normalize transcripts, audio, and metadata from supported voice platforms.</p></div></li><li><span>2</span><div><b>Evaluate consistent behaviors</b><p>Run repeatable scorecards with rationales and conversation evidence.</p></div></li><li><span>3</span><div><b>Find patterns and fix agents</b><p>Compare quality trends and inspect the exact calls behind a regression.</p></div></li></ol></section>

  <section className="section shell" style={{ borderBottom: '1px solid var(--line)' }}>
    <div style={{ maxWidth: '800px', marginBottom: '45px' }}>
      <p className="eyebrow">Why Self-Hosted Open Source</p>
      <h2 style={{ margin: '10px 0 20px' }}>Evaluate calls without exposing sensitive customer data.</h2>
      <p className="lede-small">
        Closed-source SaaS observability platforms require routing raw call recordings and transcripts to third-party databases, presenting immediate compliance risks. VaaniEval keeps all evaluation traces inside your secure perimeter.
      </p>
    </div>
    <div className="card-grid">
      <div>
        <span style={{ fontSize: '24px', display: 'block', marginBottom: '12px' }}>🔒</span>
        <h3 style={{ fontSize: '18px', margin: '0 0 10px' }}>Data Residency & Privacy</h3>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
          Keep all high-fidelity recordings, transcripts, and evaluation runs inside your own VPC (AWS, GCP, or Azure). Fully comply with GDPR and local data residency laws.
        </p>
      </div>
      <div>
        <span style={{ fontSize: '24px', display: 'block', marginBottom: '12px' }}>🏥</span>
        <h3 style={{ fontSize: '18px', margin: '0 0 10px' }}>HIPAA & PCI Guardrails</h3>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
          Route evaluations directly to your enterprise-approved Azure OpenAI or local models. Eliminate third-party SaaS middleware, hidden sub-processors, and data training leaks.
        </p>
      </div>
      <div>
        <span style={{ fontSize: '24px', display: 'block', marginBottom: '12px' }}>🔎</span>
        <h3 style={{ fontSize: '18px', margin: '0 0 10px' }}>White-Box Auditability</h3>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
          Inspect 100% of the FastAPI and React codebase. Verify that credentials encrypted using your <strong>CREDENTIAL_ENCRYPTION_KEY</strong> stay secure, and customize ingestion filters to mask PII.
        </p>
      </div>
    </div>
  </section>

  <section className="section shell"><div className="section-head"><div><p className="eyebrow">Field notes</p><h2>Practical guidance for voice-agent teams.</h2></div><Link href="/blog">Read all articles →</Link></div><div className="post-grid">{posts.map(post => <Link className="post-card" href={`/blog/${post.slug}`} key={post.slug}><span>{post.category}</span><h3>{post.title}</h3><p>{post.description}</p><small>{post.readingTime}</small></Link>)}</div></section><Cta />
</> }
