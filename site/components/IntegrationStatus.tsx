import Link from 'next/link'
import { siteConfig } from '@/lib/site'
import { TrackedLink } from './TrackedLink'

type ProviderName = 'ElevenLabs' | 'Vapi' | 'Bolna'

const INTEGRATIONS: Record<ProviderName, { href: string, label: string }> = {
  ElevenLabs: { href: '/integrations/elevenlabs', label: 'Explore the ElevenLabs integration' },
  Vapi: { href: '/integrations/vapi', label: 'Explore the Vapi integration' },
  Bolna: { href: '/integrations/bolna', label: 'Explore the Bolna integration' },
}

export function IntegrationStatus({ currentProvider }: { currentProvider: ProviderName }) {
  const otherIntegrations = (Object.keys(INTEGRATIONS) as ProviderName[]).filter((name) => name !== currentProvider)

  return <section className="integration-status" aria-labelledby="integration-support-title">
    <p className="eyebrow">Integration support</p>
    <h2 id="integration-support-title">ElevenLabs, Vapi, and Bolna are supported today.</h2>
    <p>VaaniEval supports conversation imports from ElevenLabs, Vapi, and Bolna today. More integrations are coming soon.</p>
    <div className="inline-links">
      <TrackedLink className="button" href={siteConfig.integrationRequestUrl} event="integration_request_click" target="_blank" rel="noreferrer">Request an integration on GitHub</TrackedLink>
      {otherIntegrations.map((name) => (
        <Link key={name} className="text-link" href={INTEGRATIONS[name].href}>{INTEGRATIONS[name].label} <span aria-hidden="true">→</span></Link>
      ))}
    </div>
    <p className="integration-status-note">Please do not include credentials or private call data in an integration request.</p>
  </section>
}
