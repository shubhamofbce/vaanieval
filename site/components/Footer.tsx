import Link from 'next/link'
import { BookingButton } from './BookingButton'
import { siteConfig } from '@/lib/site'
import logo from '../../frontend/src/assets/vaanievallogo.jpg'

export function Footer() {
  return <footer><div className="shell footer-grid"><div><div className="brand"><img className="brand-mark" src={logo.src} alt="VaaniEval" /><span>VaaniEval</span></div><p>Open-source evaluation for production voice agents.</p></div><div><strong>Product</strong><BookingButton className="footer-booking-button" event="calendar_booking_footer_open">Book a demo</BookingButton><Link href="/voice-ai-evaluation">Evaluation workspace</Link><Link href="/voice-agent-qa">Production QA</Link><Link href="/design-partners">Design partners</Link></div><div><strong>Resources</strong><Link href="/resources/evaluation-metrics">Evaluation metrics</Link><Link href="/resources/voice-agent-qa-checklist">QA checklist</Link><a href={siteConfig.githubUrl}>GitHub</a></div><div><strong>Open source</strong><Link href="/open-source">AGPL-3.0 license</Link><a href={siteConfig.githubUrl}>View on GitHub</a></div></div><div className="shell copyright">© {new Date().getFullYear()} VaaniEval. All rights reserved.</div></footer>
}
