import type { Metadata } from 'next'
import Link from 'next/link'
import { Cta } from '@/components/Cta'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'On-premises deployment and data residency',
  description: 'How VaaniEval runs inside your environment: customer-controlled deployment, storage, retention, access, and model-provider routing for voice AI evaluation.',
  alternates: { canonical: '/deployment' },
}

const controls = [
  ['Deployment', 'The data plane runs in the environment you choose: on-premises, in your VPC, or in a customer-controlled cloud account. Nothing depends on a shared multi-tenant service.'],
  ['Storage', 'Call media references, transcripts, evaluation runs, and results live in your object store and your database. There is no vendor-side copy.'],
  ['Retention and deletion', 'You set retention windows and deletion behaviour across transcripts, media references, evaluation results, logs, and backups.'],
  ['Credentials', 'Model-provider and platform credentials stay in your secret manager. VaaniEval reads them at runtime and never transmits them outward.'],
  ['Provider routing', 'External model calls happen only through routes you configure, per evaluation run, with a record of which inputs were sent where.'],
  ['Redaction', 'Optional redaction policies can remove names, numbers, and identifiers before any input leaves your environment for a hosted provider.'],
]

const matrix = [
  ['Self-hosted deployment (containers, PostgreSQL, object storage)', 'Available today'],
  ['Customer-controlled retention and deletion policy', 'Available today'],
  ['Per-run provider routing and egress control', 'Available today'],
  ['Air-gapped operation with self-hosted models only', 'Available today'],
  ['Entity redaction before external provider calls', 'Deployment-specific'],
  ['SSO / identity-provider integration', 'Deployment-specific'],
  ['Signed audit export and long-term evaluation archive', 'On the roadmap'],
]

export default function Page() {
  return <>
    <PageHero eyebrow="Deployment architecture" title="Your data. Your environment. Your control." description="Data residency here is product architecture, not a certification slide. Evaluating a voice model should never require creating a new system that owns your customer conversations." />
    <section className="content-shell">
      <h2>What you control</h2>
      <dl className="control-list">{controls.map(([term, copy]) => <div key={term}><dt>{term}</dt><dd>{copy}</dd></div>)}</dl>

      <h2>Reference topology</h2>
      <ol>
        <li>Approved call media and metadata are imported from your voice platform into storage you already own.</li>
        <li>An evaluation API and worker run in your cluster, reading that storage over internal network paths.</li>
        <li>Candidate models are invoked through connectors you configure: self-hosted endpoints, private endpoints, or approved hosted providers.</li>
        <li>Results, traces, and comparisons are written back to your database and surfaced in the review workspace.</li>
      </ol>
      <p>A typical first deployment is a small Kubernetes namespace or a pair of VMs with PostgreSQL and an object bucket. We size it with your infrastructure team before implementation begins.</p>

      <h2>Being precise about &ldquo;nothing leaves your environment&rdquo;</h2>
      <p>When every model under evaluation is self-hosted or reachable on a private endpoint, an evaluation can run with no external network egress at all.</p>
      <p>If you choose to benchmark a hosted model provider, that provider necessarily receives the inputs you approve. We will not claim otherwise. What VaaniEval gives you is the control layer around that decision: explicit provider routing, optional redaction, per-run approval, and a record that separates <strong>platform data stayed in your environment</strong> from <strong>approved data was sent to a provider you selected</strong>.</p>

      <h2>Capability status</h2>
      <p>So a security review starts from facts rather than marketing:</p>
      <ul className="matrix-list">{matrix.map(([capability, status]) => <li key={capability}><span>{capability}</span><b data-status={status}>{status}</b></li>)}</ul>

      <h2>Shared operating responsibilities</h2>
      <p>You control infrastructure, capacity, networking, retention, and access. VaaniEval provides deployment artifacts, upgrade guidance, health checks, and support procedures, and we agree on ownership before implementation begins.</p>
      <p>Two things are worth planning for honestly. Self-hosted deployment lengthens procurement because security and infrastructure teams are involved early, and real-time shadow evaluation increases model-provider spend. Budgets, rate limits, redaction policy, and audit logging belong in the deployment design rather than in a later surprise.</p>

      <div className="callout"><strong>Bring your security team to the demo.</strong><p>The deployment review is more productive with infrastructure and security in the room. <Link className="text-link" href="/voice-ai-evaluation">See what the evaluation workspace does</Link>.</p></div>
    </section>
    <Cta />
  </>
}
