import type { Metadata } from 'next'
import { GitHubCta } from '@/components/GitHubCta'
import { PageHero } from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Open-source self-hosted voice-agent evaluation',
  description: 'Inspect, deploy, and extend VaaniEval: an MIT-licensed, self-hosted workspace for production voice-agent evaluation and conversation QA.',
  alternates: { canonical: '/open-source' },
}

export default function Page() {
  return <>
    <PageHero eyebrow="MIT licensed · Self-hostable" title="Keep voice-agent evaluation in infrastructure you control." description="VaaniEval is an open-source workspace for importing production conversations, evaluating quality, and reviewing the evidence behind every score." />
    <section className="content-shell">
      <h2>What is in the repository</h2>
      <div className="card-grid"><div><h3>Review workspace</h3><p>React interfaces for conversation review, evaluation results, trends, and provider settings.</p></div><div><h3>Evaluation service</h3><p>A FastAPI service, background worker, evaluator-provider modules, tests, and database migrations.</p></div><div><h3>Provider adapters</h3><p>Adapter-based imports for supported voice providers so provider-specific behavior remains isolated.</p></div></div>
      <h2>A visible path from score to source</h2>
      <p>Use the code to control how conversation data enters your environment, how evaluator providers are configured, and how your team reviews transcripts, available media, scores, and rationales. Your team remains responsible for access, retention, provider permissions, and deployment choices.</p>
      <div className="callout"><strong>Start with the source.</strong><p>Read the setup and deployment guidance, inspect the implementation, and star the project if it is useful to your team.</p><div className="inline-links"><GitHubCta className="button button-github" event="github_star_open_source_click" /><a className="text-link" href="https://github.com/shubhamofbce/vaanieval/blob/main/DEPLOYMENT.md" target="_blank" rel="noreferrer">Read deployment guidance <span aria-hidden="true">→</span></a></div></div>
    </section>
  </>
}
