import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]
  if (host === 'livekit.vaanieval.com' && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/live'
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)'] }
