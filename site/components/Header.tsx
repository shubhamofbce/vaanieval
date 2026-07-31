import Link from 'next/link'
import { BookingButton } from './BookingButton'
import logo from '../../frontend/src/assets/vaanievallogo.jpg'

export function Header() {
  return <header className="site-header"><div className="shell nav-wrap">
    <Link className="brand" href="/"><img className="brand-mark" src={logo.src} alt="VaaniEval" /><span>VaaniEval</span></Link>
    <nav aria-label="Main navigation">
      <Link href="/voice-ai-evaluation">Product</Link><Link href="/integrations/elevenlabs">Integrations</Link><Link href="/resources/evaluation-metrics">Resources</Link><Link href="/blog">Blog</Link><Link href="/open-source">Open source</Link>
    </nav>
    <div className="header-actions">
      <BookingButton className="header-call-button" event="calendar_booking_header_open">Book a founder call <span aria-hidden="true">↗</span></BookingButton>
      <Link className="button button-small header-booking-button" href="/#design-partner">Apply for access</Link>
    </div>
  </div></header>
}
