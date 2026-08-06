import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${request.nextUrl.origin}/reset-password` })
    if (error) return NextResponse.json({ error: 'Unable to send reset email' }, { status: 400 })
    return NextResponse.json({ sent: true })
  } catch { return NextResponse.json({ error: 'Unable to send reset email' }, { status: 500 }) }
}
