import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider')
  if (provider !== 'github' && provider !== 'google') return NextResponse.redirect(new URL('/signin?error=provider', request.url))
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${request.nextUrl.origin}/auth/callback?next=/dashboard` } })
    if (error || !data.url) return NextResponse.redirect(new URL(`/signin?error=${provider}_unavailable`, request.url))
    return NextResponse.redirect(data.url)
  } catch (error) {
    console.error('[v0] oauth start failed', error)
    return NextResponse.redirect(new URL('/signin?error=oauth_unavailable', request.url))
  }
}
