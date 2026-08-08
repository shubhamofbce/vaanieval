import type { Metadata } from 'next'
import { VoiceDemo } from './VoiceDemo'

export const metadata: Metadata = {
  title: 'Talk to the VaaniEval voice assistant',
  description: 'Try the VaaniEval LiveKit voice assistant and ask questions about voice AI quality and evaluation coverage.',
  alternates: { canonical: 'https://livekit.vaanieval.com' },
  robots: { index: false, follow: false },
}

export default function LiveVoicePage() { return <VoiceDemo /> }
