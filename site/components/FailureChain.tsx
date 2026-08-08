'use client'

import { useEffect, useRef, useState } from 'react'

const nodes = [
  { key: 'audio', label: 'Audio', detail: '"…four thousand eight hundred twenty…"' },
  { key: 'stt', label: 'STT', detail: 'Transcribed 4,220' },
  { key: 'llm', label: 'LLM', detail: 'Intent: create payment link' },
  { key: 'tool', label: 'Tool call', detail: 'create_link(amount=4220)' },
  { key: 'tts', label: 'TTS', detail: '"Sending a link for 4,220 rupees."' },
]

export function FailureChain() {
  const root = useRef<HTMLElement>(null)
  const [step, setStep] = useState(-1)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStep(nodes.length); return }
    const node = root.current
    if (!node || typeof IntersectionObserver === 'undefined') { setStep(nodes.length); return }
    let timer: ReturnType<typeof setInterval> | undefined
    const play = () => {
      if (timer) return
      let index = -1
      timer = setInterval(() => {
        index += 1
        setStep(index)
        if (index > nodes.length && timer) clearInterval(timer)
      }, 560)
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return
      observer.disconnect()
      clearTimeout(failsafe)
      play()
    }, { threshold: 0.35 })
    observer.observe(node)
    // Never leave the trace stuck in its dimmed state if the observer never fires.
    const failsafe = setTimeout(play, 2500)
    return () => { observer.disconnect(); clearTimeout(failsafe); if (timer) clearInterval(timer) }
  }, [])

  return <figure className="chain" ref={root} aria-label="Example failure trace: a mis-transcribed amount reaches a payment link and the spoken confirmation.">
    <div className="chain-head">
      <span>turn 14 · 00:48.2</span>
      <b className={step >= nodes.length ? 'on' : ''}>High risk</b>
    </div>

    <div className="chain-compare">
      <div className="cmp ok"><small>Candidate B</small><p>Pay ₹4,<em>8</em>20 by the 12th</p></div>
      <div className="cmp bad"><small>Candidate C</small><p>Pay ₹4,<em>2</em>20 by the 12th</p></div>
    </div>

    <ol className="chain-flow">
      {nodes.map((node, index) => <li key={node.key} className={`${index <= step ? 'lit' : ''}${index >= 1 && index <= step ? ' bad' : ''}`}>
        <span className="chain-node"><i aria-hidden="true" />{node.label}</span>
        <p>{node.detail}</p>
      </li>)}
    </ol>

    <div className={`chain-out${step >= nodes.length ? ' in' : ''}`}>
      <strong>A ₹600 error reaches the payment link.</strong>
      <p>Caught in evaluation, before rollout.</p>
    </div>
    <figcaption>Illustrative turn-level trace. Sample data, not a customer call.</figcaption>
  </figure>
}
