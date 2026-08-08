import Link from 'next/link'
import { BookingButton } from './BookingButton'
import { Brand } from './Brand'

export function Footer() {
  return <footer><div className="shell footer-grid">
    <div>
      <Brand />
      <p>Private voice AI evaluation infrastructure. Benchmark STT, LLM, and TTS models on your own production calls, inside your own environment.</p>
      <BookingButton className="button button-small footer-booking-button" event="calendar_booking_footer_open">Book a demo</BookingButton>
    </div>
    <div><strong>Platform</strong><Link href="/voice-ai-evaluation">Evaluation workspace</Link><Link href="/voice-agent-qa">Production QA</Link><Link href="/deployment">Deployment architecture</Link><Link href="/design-partners">Design partners</Link></div>
    <div><strong>Integrations</strong><Link href="/integrations/elevenlabs">ElevenLabs</Link><Link href="/integrations/vapi">Vapi</Link><Link href="/integrations/bolna">Bolna</Link></div>
    <div><strong>Resources</strong><Link href="/resources/evaluation-metrics">Evaluation metrics</Link><Link href="/resources/voice-agent-qa-checklist">QA checklist</Link><Link href="/blog">Blog</Link><Link href="/privacy">Privacy</Link></div>
  </div><div className="shell copyright">© {new Date().getFullYear()} VaaniEval. All rights reserved.</div></footer>
}
