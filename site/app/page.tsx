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
  <section className="hero shell"><div><p className="eyebrow">Open-source voice AI evaluation</p><h1>Turn production calls into your next agent improvement.</h1><p className="lede">VaaniEval helps voice-agent teams find the conversations that matter, understand what went wrong, and verify the fix with evidence.</p><div className="actions"><Link className="button" href="/design-partners">Apply for the free pilot</Link><a className="button button-secondary" href={siteConfig.githubUrl}>Explore the code</a></div><p className="microcopy">Self-hosted · MIT licensed · Built for production voice-agent workflows</p></div><div className="hero-visual"><div className="product-shot"><img src="https://raw.githubusercontent.com/shubhamofbce/vaanieval/main/docs/assets/screenshots/conversation-detail.png" alt="VaaniEval conversation detail showing transcript evidence and evaluation results" /></div><div className="visual-caption"><span className="status-dot"></span><span>Conversation evidence connected to every score</span></div></div></section>
  <section className="trust-strip"><div className="shell"><span>Built for production workflows using</span><strong>ElevenLabs</strong><strong>Vapi</strong><strong>OpenAI</strong><strong>Anthropic</strong></div></section>
  <section className="section shell"><p className="eyebrow">A tighter QA loop</p><h2>Move from call volume to specific, reviewable failures.</h2><div className="feature-grid">{features.map(([title, copy], i) => <article key={title}><span className="feature-number">0{i + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
  <section className="section split shell"><div><p className="eyebrow">How it works</p><h2>From provider import to verified fix.</h2><p className="lede-small">Keep the evidence attached to every score so reviewers can understand what happened, not only whether a metric passed.</p></div><ol className="steps"><li><span>1</span><div><b>Import production calls</b><p>Normalize transcripts, audio, and metadata from supported voice platforms.</p></div></li><li><span>2</span><div><b>Evaluate consistent behaviors</b><p>Run repeatable scorecards with rationales and conversation evidence.</p></div></li><li><span>3</span><div><b>Find patterns and fix agents</b><p>Compare quality trends and inspect the exact calls behind a regression.</p></div></li></ol></section>

  <section className="section shell" style={{ borderBottom: '1px solid var(--line)' }}>
    <div style={{ maxWidth: '800px', marginBottom: '45px' }}>
      <p className="eyebrow">Built for teams that need control</p>
      <h2 style={{ margin: '10px 0 20px' }}>Keep the evaluation loop close to your product and your data.</h2>
      <p className="lede-small">
        Run VaaniEval in the environment you control, inspect how it works, and connect the evaluation models and storage choices that fit your operating requirements.
      </p>
    </div>
    <div className="card-grid">
      <div>
        <span className="card-kicker">01</span>
        <h3 style={{ fontSize: '18px', margin: '0 0 10px' }}>Deploy where you work</h3>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
          Keep conversations, transcripts, and evaluation traces in the deployment environment your team chooses.
        </p>
      </div>
      <div>
        <span className="card-kicker">02</span>
        <h3 style={{ fontSize: '18px', margin: '0 0 10px' }}>Make the workflow yours</h3>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
          Adapt ingestion, scoring, retention, and model configuration to match how your QA and engineering teams operate.
        </p>
      </div>
      <div>
        <span className="card-kicker">03</span>
        <h3 style={{ fontSize: '18px', margin: '0 0 10px' }}>Keep the evidence visible</h3>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
          Move from an aggregate score to the transcript, audio, and rationale behind the result so the next fix is easier to choose.
        </p>
      </div>
    </div>
  </section>

  <section className="section shell"><div className="section-head"><div><p className="eyebrow">Field notes</p><h2>Practical guidance for voice-agent teams.</h2></div><Link href="/blog">Read all articles →</Link></div><div className="post-grid">{posts.map(post => <Link className="post-card" href={`/blog/${post.slug}`} key={post.slug}><span>{post.category}</span><h3>{post.title}</h3><p>{post.description}</p><small>{post.readingTime}</small></Link>)}</div></section><Cta />
</> }
