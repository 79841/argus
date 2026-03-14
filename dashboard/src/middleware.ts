import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Rewrite root POST to /v1/logs (Gemini CLI sends to root URL)
  if (method === 'POST') {
    if (pathname === '/' || pathname === '/v1' || pathname === '') {
      return NextResponse.rewrite(new URL('/v1/logs', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
