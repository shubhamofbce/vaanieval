'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

function useInView<T extends HTMLElement>(once = true) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return }
    let failsafe: ReturnType<typeof setTimeout>
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setInView(true)
        clearTimeout(failsafe)
        if (once) observer.disconnect()
      } else if (!once) setInView(false)
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' })
    observer.observe(node)
    // Content must never stay hidden if the observer is throttled or never fires.
    failsafe = setTimeout(() => setInView(true), 1500)
    return () => { observer.disconnect(); clearTimeout(failsafe) }
  }, [once])
  return { ref, inView }
}

export function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }: { children: ReactNode, delay?: number, as?: 'div' | 'article' | 'li', className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return <Tag ref={ref as never} className={`reveal${inView ? ' in' : ''} ${className}`.trim()} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>
}

export function CountUp({ value, prefix = '', suffix = '', decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return }
    let frame = 0
    const start = performance.now()
    const duration = 1100
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setShown(value * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value])

  const formatted = decimals > 0 ? shown.toFixed(decimals) : Math.round(shown).toLocaleString()
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>
}
