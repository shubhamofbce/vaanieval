import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Analytics } from '@/components/Analytics'
import { AttributionTracker } from '@/components/AttributionTracker'
import { siteConfig } from '@/lib/site'
import logo from '../../frontend/src/assets/vaanievallogo.jpg'
import './globals.css'

// One face across the marketing site and the console. Clinic carries hierarchy
// with weight and rule, so the sans ships the weights the headings need and the
// mono is reserved for measurements, never used as a costume for "technical".
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono', display: 'swap' })

// Theme is read before first paint so a returning visitor never sees a white
// flash before their dark preference applies.
const THEME_BOOT = `(function(){try{var t=localStorage.getItem('vaani.theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;}catch(e){}})()`

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: 'Voice AI Observability and Evaluation | VaaniEval', template: '%s | VaaniEval' },
  description: siteConfig.description,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'VaaniEval', title: 'Voice AI Observability and Evaluation | VaaniEval', description: siteConfig.description, url: '/' },
  twitter: { card: 'summary_large_image', title: 'Voice AI Observability and Evaluation | VaaniEval', description: siteConfig.description },
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/png', sizes: '48x48' }],
    shortcut: ['/favicon.ico'],
    apple: [{ url: logo.src, type: 'image/jpeg', sizes: '1024x1024' }],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION?.startsWith('replace-') ? undefined : process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION?.startsWith('replace-') ? {} : { 'msvalidate.01': process.env.BING_SITE_VERIFICATION || '' },
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'VaaniEval', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: siteConfig.description, url: siteConfig.url, codeRepository: siteConfig.githubUrl, license: 'https://www.gnu.org/licenses/agpl-3.0.html' }
  return <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head><body><a className="skip-link" href="#main">Skip to content</a><Header /><main id="main">{children}</main><Footer /><Analytics /><AttributionTracker /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></body></html>
}
