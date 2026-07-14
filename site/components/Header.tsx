import Link from 'next/link'
import { GitHubCta } from './GitHubCta'

export function Header() {
  return <header className="site-header"><div className="shell nav-wrap">
    <Link className="brand" href="/"><span className="brand-mark">V</span><span>VaaniEval</span></Link>
    <nav aria-label="Main navigation">
      <Link href="/voice-ai-evaluation">Product</Link><Link href="/integrations/elevenlabs">Integrations</Link><Link href="/resources/evaluation-metrics">Resources</Link><Link href="/blog">Blog</Link><Link href="/open-source">Open source</Link>
    </nav>
    <GitHubCta className="button button-small button-github" event="github_star_header_click" />
  </div></header>
}
