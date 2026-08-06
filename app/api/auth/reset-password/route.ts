import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    if (!password || password.length < 8) return NextResponse.json({ error: 'Use at least 8 characters' }, { status: 400 })
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return NextResponse.json({ error: 'This reset link has expired. Request a new one.' }, { status: 400 })
    return NextResponse.json({ updated: true })
  } catch { return NextResponse.json({ error: 'Unable to update password' }, { status: 500 }) }
}
