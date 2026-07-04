import Link from 'next/link'
import { siteConfig } from '@/lib/site'

export function Header() {
  return <header className="site-header"><div className="shell nav-wrap">
    <Link className="brand" href="/"><span className="brand-mark">V</span><span>VaaniEval</span></Link>
    <nav aria-label="Main navigation">
      <Link href="/voice-ai-evaluation">Product</Link><Link href="/integrations/elevenlabs">Integrations</Link><Link href="/resources/evaluation-metrics">Resources</Link><Link href="/blog">Blog</Link><Link href="/open-source">Open source</Link>
    </nav>
    <a className="button button-small" href={`${siteConfig.appUrl}/login`}>Open app</a>
  </div></header>
}
