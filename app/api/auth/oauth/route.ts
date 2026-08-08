import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAppPath } from '@/lib/config'

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider')
  if (provider !== 'github' && provider !== 'google') return NextResponse.redirect(new URL('/signin?error=provider', request.url))
  try {
    const supabase = await createClient()
    // In production this must resolve to the hosted app URL, never localhost —
    // Supabase validates the redirect against the URLs registered in the
    // Supabase dashboard (Authentication > URL Configuration) and Google's
    // OAuth console. NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL is only meant for
    // overriding the local-dev callback (e.g. http://localhost:3000/auth/callback).
    const redirectBase =
      process.env.NODE_ENV === 'production'
        ? resolveAppPath('/auth/callback', request.nextUrl.origin)
        : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || resolveAppPath('/auth/callback', request.nextUrl.origin)
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
