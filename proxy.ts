import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = new Set(['/','/signin','/signup','/login','/forgot-password','/reset-password','/auth/callback'])

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.has(pathname) || pathname.startsWith('/api/auth/') || pathname.startsWith('/api/github/callback') || pathname.startsWith('/api/github/webhook') || pathname.startsWith('/api/logs')
  if (isPublic || pathname.startsWith('/_next') || pathname.includes('.')) return NextResponse.next()

  const session = request.cookies.get('session')?.value
  if (!session && (pathname.startsWith('/dashboard') || pathname.startsWith('/settings') || pathname.startsWith('/clusters') || pathname.startsWith('/investigations') || pathname.startsWith('/api/'))) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
