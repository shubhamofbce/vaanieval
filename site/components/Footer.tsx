import Link from 'next/link'
import { siteConfig } from '@/lib/site'
import logo from '../../frontend/src/assets/vaanievallogo.jpg'

export function Footer() {
  return <footer><div className="shell footer-grid"><div><div className="brand"><img className="brand-mark" src={logo.src} alt="VaaniEval" /><span>VaaniEval</span></div><p>Open-source, self-hosted evaluation for production voice agents.</p></div><div><strong>Product</strong><Link href="/voice-ai-evaluation">Evaluation workspace</Link><Link href="/voice-agent-qa">Production QA</Link><Link href="/design-partners">Design partners</Link></div><div><strong>Resources</strong><Link href="/resources/evaluation-metrics">Evaluation metrics</Link><Link href="/resources/voice-agent-qa-checklist">QA checklist</Link><a href={siteConfig.githubUrl}>GitHub</a></div><div><strong>Open source</strong><Link href="/open-source">Self-hosting</Link><a href={siteConfig.contactUrl}>Contact</a></div></div><div className="shell copyright">© {new Date().getFullYear()} VaaniEval. MIT licensed.</div></footer>
}
