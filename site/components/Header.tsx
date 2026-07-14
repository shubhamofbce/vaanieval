import Link from 'next/link'
import { TrackedLink } from './TrackedLink'
import { siteConfig } from '@/lib/site'

export function Header() {
  return <header className="site-header"><div className="shell nav-wrap">
    <Link className="brand" href="/"><span className="brand-mark">V</span><span>VaaniEval</span></Link>
    <nav aria-label="Main navigation">
      <Link href="/voice-ai-evaluation">Product</Link><Link href="/integrations/elevenlabs">Integrations</Link><Link href="/resources/evaluation-metrics">Resources</Link><Link href="/blog">Blog</Link><Link href="/open-source">Open source</Link>
    </nav>
    <TrackedLink className="button button-small header-try-button" href={siteConfig.appUrl} event="hosted_app_header_click">Try now</TrackedLink>
  </div></header>
}
