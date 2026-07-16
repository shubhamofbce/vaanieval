import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Analytics } from '@/components/Analytics'
import { siteConfig } from '@/lib/site'
import logo from '../../frontend/src/assets/vaanievallogo.jpg'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: 'VaaniEval — Self-hosted voice-agent evaluation', template: '%s | VaaniEval' },
  description: siteConfig.description,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'VaaniEval', title: 'VaaniEval — Self-hosted voice-agent evaluation', description: siteConfig.description, url: '/' },
  twitter: { card: 'summary_large_image', title: 'VaaniEval — Self-hosted voice-agent evaluation', description: siteConfig.description },
  icons: { icon: logo.src },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION?.startsWith('replace-') ? undefined : process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION?.startsWith('replace-') ? {} : { 'msvalidate.01': process.env.BING_SITE_VERIFICATION || '' },
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'VaaniEval', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: siteConfig.description, url: siteConfig.url, codeRepository: siteConfig.githubUrl, license: 'https://opensource.org/license/mit' }
  return <html lang="en"><body><Header /><main>{children}</main><Footer /><Analytics /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></body></html>
}
