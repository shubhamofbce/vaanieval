import Link from 'next/link'
import { BookingButton } from './BookingButton'
import { TrackedLink } from './TrackedLink'
import { siteConfig } from '@/lib/site'
import logo from '../../frontend/src/assets/vaanievallogo.jpg'

export function Header() {
  return <header className="site-header"><div className="shell nav-wrap">
    <Link className="brand" href="/"><img className="brand-mark" src={logo.src} alt="VaaniEval" /><span>VaaniEval</span></Link>
    <nav aria-label="Main navigation">
      <Link href="/voice-ai-evaluation">Product</Link><Link href="/integrations/elevenlabs">Integrations</Link><Link href="/resources/evaluation-metrics">Resources</Link><Link href="/blog">Blog</Link><Link href="/open-source">Source license</Link>
    </nav>
    <div className="header-actions">
      <TrackedLink className="button button-small button-secondary header-try-button" href={siteConfig.appUrl} event="hosted_app_header_click">Try now</TrackedLink>
      <BookingButton className="button button-small header-booking-button" event="calendar_booking_header_open">Book a demo</BookingButton>
    </div>
  </div></header>
}
