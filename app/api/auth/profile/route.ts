import { NextRequest, NextResponse } from 'next/server'
import { getSession, setSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

interface UserRecord {
  email?: string
  user_metadata?: { name?: string; avatar_url?: string }
}

function nameFromUser(user: UserRecord | null, fallbackName?: string): string {
  return user?.user_metadata?.name || fallbackName || user?.email?.split('@')[0] || ''
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    const user = data.user
    const email = user?.email ?? session.user.email

    return NextResponse.json({
      user: {
        id: session.user.id,
        email,
        name: nameFromUser(user, session.user.name),
        avatarUrl: user?.user_metadata?.avatar_url ?? null,
      },
    })
  } catch (error) {
    console.error('[v0] profile fetch failed', error)
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : ''
    const avatarUrl = typeof body?.avatarUrl === 'string' ? body.avatarUrl.trim().slice(0, 500) : ''

    const supabase = await createClient()
    const { data, error } = await supabase.auth.updateUser({
      data: { name, avatar_url: avatarUrl || null },
    })
    if (error || !data.user) {
      console.error('[v0] profile update rejected:', error?.message)
      return NextResponse.json({ error: 'Unable to update profile' }, { status: 400 })
    }

    await setSession(session.user.id, {
      email: data.user.email ?? session.user.email,
      name: nameFromUser(data.user, session.user.name),
      avatarUrl: avatarUrl || null,
    })

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: data.user.email ?? session.user.email,
        name: nameFromUser(data.user, session.user.name),
        avatarUrl: avatarUrl || null,
      },
    })
  } catch (error) {
    console.error('[v0] profile update failed', error)
    return NextResponse.json({ error: 'Unable to update profile' }, { status: 500 })
  }
}
