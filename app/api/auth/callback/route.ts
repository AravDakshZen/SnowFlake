import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(url.searchParams.get('error') ?? 'OAuth callback unavailable')}`, url.origin))
}
