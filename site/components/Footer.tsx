import Link from 'next/link'
import { siteConfig } from '@/lib/site'

export function Footer() {
  return <footer><div className="shell footer-grid"><div><div className="brand"><span className="brand-mark">V</span><span>VaaniEval</span></div><p>Open-source QA for production voice agents.</p></div><div><strong>Product</strong><Link href="/voice-ai-evaluation">Evaluation</Link><Link href="/voice-agent-qa">Voice AI QA</Link><Link href="/design-partners">Design partners</Link></div><div><strong>Resources</strong><Link href="/blog">Blog</Link><Link href="/resources/voice-agent-qa-checklist">QA checklist</Link><a href={siteConfig.githubUrl}>GitHub</a></div><div><strong>Company</strong><Link href="/privacy">Privacy</Link><a href={siteConfig.contactUrl}>Contact</a></div></div><div className="shell copyright">© {new Date().getFullYear()} VaaniEval. MIT licensed.</div></footer>
}
