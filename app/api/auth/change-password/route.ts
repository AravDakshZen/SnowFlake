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
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
    if (!currentPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Enter your current password and a new password with at least 8 characters' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: email ?? '',
      password: currentPassword,
    })
    if (verifyError) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      console.error('[v0] password update rejected:', updateError.message)
      return NextResponse.json(
        { error: updateError.message.toLowerCase().includes('recent') ? 'Re-authenticate to change your password' : 'Unable to change password' },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[v0] password change failed', error)
    return NextResponse.json({ error: 'Unable to change password' }, { status: 500 })
  }
}
