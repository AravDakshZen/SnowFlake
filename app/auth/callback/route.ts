import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const nextParam = request.nextUrl.searchParams.get('next') ?? '/dashboard'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/signin?error=oauth_callback', request.url))
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      await setSession(data.user.id, { email: data.user.email, name: data.user.user_metadata?.name ?? data.user.user_metadata?.full_name })
      return NextResponse.redirect(new URL(next, request.url))
    }
  } catch (error) { console.error('[v0] auth callback failed', error) }
  return NextResponse.redirect(new URL('/signin?error=oauth_callback', request.url))
}
