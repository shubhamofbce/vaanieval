/* Attribution: where a visitor came from, kept intact across the whole product.
 *
 * GA4 already reads utm_* on the page it lands on, but that alone answers the
 * wrong question. Three things break it in practice, and this file fixes all
 * three:
 *
 * 1. The visitor crosses to demo.vaanieval.com, a different host served by a
 *    different app. Without forwarding, the demo session looks like direct
 *    traffic and the funnel splits in two.
 * 2. The visitor lands on Monday with a campaign link and books on Thursday
 *    from a bookmark. The URL no longer carries anything, so the lead arrives
 *    unattributed unless first touch was written down at the time.
 * 3. Links shared one-to-one ("here, take a look") are not campaigns. They need
 *    a short param a human can type, not a five-part utm string.
 *
 * First touch is written once and never overwritten: it answers "what made this
 * person show up at all". Last touch is overwritten every visit: it answers
 * "what brought them back today". Both are stored on the registrable domain so
 * every vaanieval.com host can read them.
 */

export type Attribution = {
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
  /* Short one-to-one share code: ?ref=acme-priya is friendlier than five
     utm params and still lands in the same report. */
  ref?: string
  /* Ad-network click ids, kept so paid clicks reconcile against the network. */
  gclid?: string
  fbclid?: string
  li_fat_id?: string
  /* Referring document, only useful when nothing was tagged. */
  referrer?: string
  landing?: string
  ts?: string
}

const FIRST = 'va_attr_first'
const LAST = 'va_attr_last'

/* Cookies are set on the registrable domain rather than the exact host so the
   marketing site and the demo console share one identity. On localhost and
   preview hosts we leave the domain off, which keeps them host-scoped. */
function cookieDomain(): string {
  const host = location.hostname
  if (host === 'localhost' || /^[\d.]+$/.test(host)) return ''
  const parts = host.split('.')
  if (parts.length < 2) return ''
  return '.' + parts.slice(-2).join('.')
}

function writeCookie(name: string, value: string, days: number) {
  const domain = cookieDomain()
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; samesite=lax${domain ? `; domain=${domain}` : ''}${location.protocol === 'https:' ? '; secure' : ''}`
}

function readCookie(name: string): string | null {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(name + '='))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null
}

function parse(raw: string | null): Attribution | null {
  if (!raw) return null
  try { return JSON.parse(raw) as Attribution } catch { return null }
}

/* Only what the URL actually carries. An empty object means this visit was not
   tagged, which is a real answer and must not be written over first touch. */
export function fromUrl(search: string, referrer: string, pathname: string): Attribution {
  const q = new URLSearchParams(search)
  const pick = (...keys: string[]) => {
    for (const k of keys) { const v = q.get(k)?.trim(); if (v) return v.slice(0, 120) }
    return undefined
  }
  const attr: Attribution = {
    source: pick('utm_source'),
    medium: pick('utm_medium'),
    campaign: pick('utm_campaign'),
    content: pick('utm_content'),
    term: pick('utm_term'),
    ref: pick('ref', 'via'),
    gclid: pick('gclid'),
    fbclid: pick('fbclid'),
    li_fat_id: pick('li_fat_id'),
  }
  const tagged = Object.values(attr).some(Boolean)
  if (!tagged) {
    /* An untagged visit still carries one fact worth keeping: who linked here.
       Self-referrals are noise, so they are dropped. */
    try {
      const host = referrer ? new URL(referrer).hostname : ''
      if (host && !host.endsWith('vaanieval.com')) attr.referrer = host
    } catch { /* opaque referrer */ }
    if (!attr.referrer) return {}
  }
  attr.landing = pathname
  attr.ts = new Date().toISOString()
  return attr
}

export function capture(): { first: Attribution | null, last: Attribution | null, isNew: boolean } {
  if (typeof window === 'undefined') return { first: null, last: null, isNew: false }
  const current = fromUrl(location.search, document.referrer, location.pathname)
  const hasSomething = Object.keys(current).length > 0

  let first = parse(readCookie(FIRST))
  let isNew = false
  if (!first && hasSomething) {
    first = current
    isNew = true
    writeCookie(FIRST, JSON.stringify(current), 365)
  }

  let last = parse(readCookie(LAST))
  if (hasSomething) {
    last = current
    writeCookie(LAST, JSON.stringify(current), 90)
  }

  return { first, last, isNew }
}

export function current(): { first: Attribution | null, last: Attribution | null } {
  if (typeof window === 'undefined') return { first: null, last: null }
  return { first: parse(readCookie(FIRST)), last: parse(readCookie(LAST)) }
}

/* Flat key/value for an analytics event or a form submission. Prefixes keep
   first and last touch distinguishable in one row. */
export function toProps(): Record<string, string> {
  const { first, last } = current()
  const out: Record<string, string> = {}
  const add = (prefix: string, a: Attribution | null) => {
    if (!a) return
    for (const [k, v] of Object.entries(a)) if (v) out[`${prefix}_${k}`] = String(v)
  }
  add('first', first)
  add('last', last)
  return out
}

/* Carry attribution onto another VaaniEval host. The demo console is a separate
   app on a separate origin, so nothing but the URL crosses; without this the
   demo cannot tell a campaign visitor from a bookmark. */
export function decorate(href: string): string {
  if (typeof window === 'undefined') return href
  let url: URL
  try { url = new URL(href, location.href) } catch { return href }
  const sameProduct = url.hostname.endsWith('vaanieval.com') || url.hostname === location.hostname
  if (!sameProduct || url.hostname === location.hostname) return href

  const { first, last } = current()
  const carry = last || first
  if (!carry) return href

  const map: Array<[keyof Attribution, string]> = [
    ['source', 'utm_source'], ['medium', 'utm_medium'], ['campaign', 'utm_campaign'],
    ['content', 'utm_content'], ['term', 'utm_term'], ['ref', 'ref'],
  ]
  for (const [key, param] of map) {
    const value = carry[key]
    if (value && !url.searchParams.has(param)) url.searchParams.set(param, String(value))
  }
  /* Where the click happened, so the demo can separate "hero CTA" from
     "footer link" without the marketing site guessing. */
  if (!url.searchParams.has('utm_referrer')) url.searchParams.set('utm_referrer', location.hostname)
  return url.toString()
}
