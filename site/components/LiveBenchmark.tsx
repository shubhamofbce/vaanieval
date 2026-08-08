'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Stack = {
  id: string
  name: string
  tag: string
  wer: string
  critical: string
  latency: string
  verdict: 'base' | 'ok' | 'bad'
}

const stacks: Stack[] = [
  { id: 'a', name: 'Current stack', tag: 'in production', wer: '11.4%', critical: '6', latency: '1.42s', verdict: 'base' },
  { id: 'b', name: 'Candidate B', tag: 'recommended', wer: '8.1%', critical: '1', latency: '0.91s', verdict: 'ok' },
  { id: 'c', name: 'Candidate C', tag: 'best WER', wer: '7.6%', critical: '9', latency: '2.10s', verdict: 'bad' },
]

const transcript: { id: string, label: string, text: string, flag?: string }[] = [
  { id: 'ref', label: 'AUDIO', text: '…four thousand eight hundred twenty rupees…' },
  { id: 'b', label: 'CAND. B', text: '₹4,820', flag: 'match' },
  { id: 'c', label: 'CAND. C', text: '₹4,220', flag: 'mismatch' },
]

export function LiveBenchmark() {
  const root = useRef<HTMLElement>(null)
  const [t, setT] = useState(0)
  const active = useRef(true)

  const bars = useMemo(() => Array.from({ length: 52 }, (_, i) => 0.24 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.31)) * 0.76), [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setT(1); return }
    const node = root.current
    let observer: IntersectionObserver | undefined
    if (node && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(entries => { active.current = entries[0].isIntersecting }, { threshold: 0.1 })
      observer.observe(node)
    }
    let frame = 0
    let start = performance.now()
    const duration = 6400
    const tick = (now: number) => {
      if (active.current) setT(((now - start) % duration) / duration)
      else start = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); observer?.disconnect() }
  }, [])

  // 0 → .45 replays the call, .45 → 1 holds the finished result on screen.
  const scan = Math.min(1, t / 0.45)
  const settled = t >= 0.45
  const scanned = Math.round(scan * 1000)

  return <figure className="live" ref={root} aria-label="Example benchmark result: Candidate C has the lowest error rate but nine critical errors on amounts, so Candidate B is recommended.">
    <div className="live-verdict-top">
      <p className="live-kicker">Benchmark result</p>
      <p className="live-claim">The lowest error rate is not the safest model.</p>
      <div className="live-verdict-pair">
        <div className="vp bad">
          <small>Best WER</small>
          <strong>Candidate C · 7.6%</strong>
          <span>9 critical errors on amounts</span>
        </div>
        <div className="vp ok">
          <small>Recommended</small>
          <strong>Candidate B · 8.1%</strong>
          <span>1 critical error · 36% faster</span>
        </div>
      </div>
    </div>

    <div className="live-chrome">
      <span className="live-path">collections-hi-en · 1,000 calls</span>
      <span className={`live-status${settled ? ' is-done' : ''}`}><i aria-hidden="true" />{settled ? 'Complete' : `${scanned.toLocaleString()} / 1,000`}</span>
    </div>

    <div className="live-body">
      <div className="live-wave" aria-hidden="true">
        {bars.map((height, index) => <i key={index} className={index / bars.length <= scan ? 'on' : ''} style={{ height: `${height * 100}%` }} />)}
        {!settled && <span className="live-playhead" style={{ left: `${scan * 100}%` }} />}
      </div>

      <ul className="live-transcript">
        {transcript.map(line => <li key={line.id} className={`tx-${line.id}${line.flag === 'mismatch' ? ' bad' : ''}`}>
          <small>{line.label}</small>
          <p>{line.text}{line.flag && <b>{line.flag}</b>}</p>
        </li>)}
      </ul>

      <div className="live-table-wrap">
      <table className="live-table">
        <thead><tr><th scope="col">Stack</th><th scope="col">WER</th><th scope="col">Critical</th><th scope="col">P50</th></tr></thead>
        <tbody>{stacks.map(stack => <tr key={stack.id} className={`r-${stack.verdict}`}>
          <th scope="row"><strong>{stack.name}</strong><em>{stack.tag}</em></th>
          <td>{stack.wer}</td>
          <td className={stack.verdict === 'bad' ? 'flag' : ''}>{stack.critical}</td>
          <td>{stack.latency}</td>
        </tr>)}</tbody>
      </table>
      </div>
    </div>
    <figcaption>Illustrative evaluation run. Sample data, not a customer result.</figcaption>
  </figure>
}
