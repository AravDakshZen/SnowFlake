import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider')
  if (provider !== 'github' && provider !== 'google') return NextResponse.redirect(new URL('/signin?error=provider', request.url))
  try {
    const supabase = await createClient()
    const redirectBase = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${request.nextUrl.origin}/auth/callback`
    const redirectUrl = new URL(redirectBase)
    redirectUrl.searchParams.set('next', '/dashboard')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUrl.toString() },
    })
    if (error || !data.url) return NextResponse.redirect(new URL(`/signin?error=${provider}_unavailable`, request.url))
    return NextResponse.redirect(data.url)
  } catch (error) {
    console.error('[v0] oauth start failed', error)
    return NextResponse.redirect(new URL('/signin?error=oauth_unavailable', request.url))
  }
}
