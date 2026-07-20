import { useEffect } from 'react'

declare global {
  interface Window {
    $chatwoot?: { toggle: (state?: 'open' | 'close') => void }
    chatwootSettings?: { position: 'left' | 'right'; type: 'standard' | 'expanded_bubble'; launcherTitle?: string }
    chatwootSDK?: { run: (options: { websiteToken: string; baseUrl: string }) => void }
  }
}

const baseUrl = 'https://app.chatwoot.com'
const websiteToken = import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN

export function openChatwootSupport() {
  window.$chatwoot?.toggle('open')
}

export function ChatwootWidget() {
  useEffect(() => {
    if (!websiteToken || document.getElementById('chatwoot-sdk')) return

    window.chatwootSettings = {
      position: 'right',
      type: 'standard',
      launcherTitle: 'Help & feedback',
    }

    const script = document.createElement('script')
    script.id = 'chatwoot-sdk'
    script.async = true
    script.src = `${baseUrl}/packs/js/sdk.js`
    script.onload = () => window.chatwootSDK?.run({ websiteToken, baseUrl })
    document.head.appendChild(script)
  }, [])

  return null
}
