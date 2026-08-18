'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { BookingButton } from './BookingButton'
import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'

const productLinks = [
  { href: '/voice-agent-qa', label: 'Call observability', copy: 'Review recordings, transcripts, outcomes, and evidence.' },
  { href: '/#monitoring', label: 'Production monitoring', copy: 'Track QA coverage, trends, and priority calls.' },
  { href: '/voice-ai-evaluation', label: 'Evaluation and experiments', copy: 'Compare changes with stable criteria.' },
]

const resourceLinks = [
  { href: '/resources/evaluation-metrics', label: 'Evaluation metrics' },
  { href: '/resources/voice-agent-qa-checklist', label: 'QA checklist' },
  { href: '/blog', label: 'Blog' },
]

const mobileLinks = [
  { href: '/voice-agent-qa', label: 'Call observability' },
  { href: '/#monitoring', label: 'Production monitoring' },
  { href: '/voice-ai-evaluation', label: 'Evaluation and experiments' },
  { href: '/integrations/elevenlabs', label: 'Integrations' },
  { href: '/deployment', label: 'Security' },
  { href: '/resources/evaluation-metrics', label: 'Resources' },
  { href: '/blog', label: 'Blog' },
  { href: 'https://demo.vaanieval.com', label: 'Docs', external: true },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('mousedown', onPointerDown); document.removeEventListener('keydown', onKeyDown) }
  }, [open])

  return <header className="site-header"><div className="shell nav-wrap">
    <Brand href="/" />
    <nav aria-label="Main navigation">
      <details className="nav-menu">
        <summary>Product <span aria-hidden="true">⌄</span></summary>
        <div className="nav-popover nav-popover-wide">
          {productLinks.map(link => <Link key={link.href} href={link.href}><strong>{link.label}</strong><small>{link.copy}</small></Link>)}
        </div>
      </details>
      <Link href="/integrations/elevenlabs">Integrations</Link>
      <Link href="/deployment">Security</Link>
      <details className="nav-menu">
        <summary>Resources <span aria-hidden="true">⌄</span></summary>
        <div className="nav-popover">
          {resourceLinks.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </div>
      </details>
      <a href="https://demo.vaanieval.com" target="_blank" rel="noreferrer">Docs</a>
    </nav>
    <div className="header-actions">
      <ThemeToggle />
      <div className="mobile-nav" ref={menuRef}>
        <button type="button" className="mobile-nav-toggle" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(value => !value)}>
          <span aria-hidden="true" />
        </button>
        {open && <div className="mobile-nav-panel" id="mobile-menu">
          {mobileLinks.map(link => link.external
            ? <a key={link.href} href={link.href} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>{link.label}</a>
            : <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
        </div>}
      </div>
      <BookingButton className="button button-small" event="calendar_booking_header_open">Book a call <span aria-hidden="true">↗</span></BookingButton>
    </div>
  </div></header>
}
