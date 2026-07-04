'use client'

import Script from 'next/script'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

const gaId = process.env.NEXT_PUBLIC_GA_ID
const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID
const validGa = Boolean(gaId && !gaId.includes('XXXX'))
const validClarity = Boolean(clarityId && !clarityId.includes('XXXX'))

export function Analytics() {
  return <>
    <VercelAnalytics />
    <SpeedInsights />
    {validGa && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}</Script>
    </>}
    {validClarity && <Script id="clarity" strategy="afterInteractive">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,'clarity','script','${clarityId}');`}</Script>}
  </>
}
