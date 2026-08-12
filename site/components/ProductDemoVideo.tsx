'use client'

import { track } from '@vercel/analytics'
import { useState } from 'react'

type ProductDemoVideoProps = {
  videoId: string
}

export function ProductDemoVideo({ videoId }: ProductDemoVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  function playVideo() {
    track('video_product_walkthrough_home_start', { video_id: videoId })
    window.gtag?.('event', 'video_product_walkthrough_home_start', { video_id: videoId })
    setIsPlaying(true)
  }

  if (isPlaying) {
    return <div className="product-demo-video">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
        title="VaaniEval product walkthrough"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  }

  return <div className="product-demo-video">
    <button className="product-demo-play-button" type="button" onClick={playVideo} aria-label="Play the VaaniEval product walkthrough">
      <span className="product-demo-play-icon" aria-hidden="true">▶</span>
      <span>Play product walkthrough</span>
      <small>YouTube loads after you choose to play</small>
    </button>
  </div>
}
