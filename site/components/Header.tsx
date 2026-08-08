'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { BookingButton } from './BookingButton'
import { Brand } from './Brand'

const links = [
  { href: '/voice-ai-evaluation', label: 'Platform' },
  { href: '/deployment', label: 'Deployment' },
  { href: '/integrations/elevenlabs', label: 'Integrations' },
  { href: '/resources/evaluation-metrics', label: 'Resources' },
]

const mobileLinks = [...links, { href: '/blog', label: 'Blog' }, { href: '/design-partners', label: 'Design partners' }]

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
    <nav aria-label="Main navigation">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
    <div className="header-actions">
      <div className="mobile-nav" ref={menuRef}>
        <button type="button" className="mobile-nav-toggle" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(value => !value)}>
          <span aria-hidden="true" />
        </button>
        {open && <div className="mobile-nav-panel" id="mobile-menu">
          {mobileLinks.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
        </div>}
      </div>
      <BookingButton className="button button-small" event="calendar_booking_header_open">Book a demo <span aria-hidden="true">↗</span></BookingButton>
    </div>
  </div></header>
}
