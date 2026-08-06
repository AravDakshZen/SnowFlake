import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()
    if (!name || !email || !password || password.length < 8) return NextResponse.json({ error: 'Use a name, valid email, and password with at least 8 characters' }, { status: 400 })
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${request.nextUrl.origin}/auth/callback?next=/signin` } })
    if (error) return NextResponse.json({ error: error.message.toLowerCase().includes('already') ? 'An account with this email already exists' : 'Unable to create account' }, { status: 400 })
    return NextResponse.json({ requiresEmailConfirmation: !data.session })
  } catch (error) {
    console.error('[v0] sign up failed', error)
    return NextResponse.json({ error: 'Unable to create account right now' }, { status: 500 })
  }
}
