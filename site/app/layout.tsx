import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Analytics } from '@/components/Analytics'
import { siteConfig } from '@/lib/site'
import logo from '../../frontend/src/assets/vaanievallogo.jpg'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: 'VaaniEval | Private voice AI evaluation infrastructure', template: '%s | VaaniEval' },
  description: siteConfig.description,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'VaaniEval', title: 'VaaniEval | Private voice AI evaluation infrastructure', description: siteConfig.description, url: '/' },
  twitter: { card: 'summary_large_image', title: 'VaaniEval | Private voice AI evaluation infrastructure', description: siteConfig.description },
  icons: { icon: logo.src },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION?.startsWith('replace-') ? undefined : process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION?.startsWith('replace-') ? {} : { 'msvalidate.01': process.env.BING_SITE_VERIFICATION || '' },
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'VaaniEval', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: siteConfig.description, url: siteConfig.url, codeRepository: siteConfig.githubUrl, license: 'https://www.gnu.org/licenses/agpl-3.0.html' }
  return <html lang="en" className={inter.variable}><body><a className="skip-link" href="#main">Skip to content</a><Header /><main id="main">{children}</main><Footer /><Analytics /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></body></html>
}
