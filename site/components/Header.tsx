import Link from 'next/link'
import { GitHubCta } from './GitHubCta'
import { TrackedLink } from './TrackedLink'
import { siteConfig } from '@/lib/site'
import logo from '../../frontend/src/assets/vaanievallogo.jpg'

export function Header() {
  return <header className="site-header"><div className="shell nav-wrap">
    <Link className="brand" href="/"><img className="brand-mark" src={logo.src} alt="VaaniEval" /><span>VaaniEval</span></Link>
    <nav aria-label="Main navigation">
      <Link href="/voice-ai-evaluation">Product</Link><Link href="/integrations/elevenlabs">Integrations</Link><Link href="/resources/evaluation-metrics">Resources</Link><Link href="/blog">Blog</Link><Link href="/open-source">Open source</Link>
    </nav>
    <div className="header-actions">
      <GitHubCta className="button button-small button-github header-github-button" event="github_star_header_click">Star</GitHubCta>
      <TrackedLink className="button button-small header-try-button" href={siteConfig.appUrl} event="hosted_app_header_click">Try now</TrackedLink>
    </div>
  </div></header>
}
