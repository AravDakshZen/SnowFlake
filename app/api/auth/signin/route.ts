import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    await setSession(data.user.id, { email: data.user.email, name: data.user.user_metadata?.name ?? data.user.email?.split('@')[0] })
    return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
  } catch (error) {
    console.error('[v0] sign in failed', error)
    return NextResponse.json({ error: 'Unable to sign in right now' }, { status: 500 })
  }
}
