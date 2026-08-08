import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ email })
    if (error) {
      console.error('[v0] email change rejected:', error.message)
      return NextResponse.json(
        { error: error.message.toLowerCase().includes('already') ? 'An account with this email already exists' : 'Unable to change email' },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, message: 'Confirmation email sent' })
  } catch (error) {
    console.error('[v0] email change failed', error)
    return NextResponse.json({ error: 'Unable to change email' }, { status: 500 })
  }
}
