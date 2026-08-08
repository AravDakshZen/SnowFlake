import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

export async function DELETE() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Account deletion is not configured' }, { status: 500 })
    }

    const userId = session.user.id
    const sql = getSql()

    const projects = await sql`
      SELECT id FROM public.projects WHERE user_id = ${userId}
    `
    const projectIds = projects.map((p) => p.id)

    await sql`
      DELETE FROM public.api_keys WHERE user_id = ${userId}
    `
    await sql`
      DELETE FROM public.github_configs WHERE user_id = ${userId}
    `
    await sql`
      DELETE FROM public.llm_configs WHERE user_id = ${userId}
    `
    await sql`
      DELETE FROM public.alert_configs WHERE user_id = ${userId}
    `
    await sql`
      DELETE FROM public.outbound_webhooks WHERE user_id = ${userId}
    `
    if (projectIds.length > 0) {
      await sql`
        DELETE FROM public.investigations WHERE project_id = ANY(${projectIds})
      `
      await sql`
        DELETE FROM public.clusters WHERE project_id = ANY(${projectIds})
      `
      await sql`
        DELETE FROM public.api_logs WHERE project_id = ANY(${projectIds})
      `
      await sql`
        DELETE FROM public.audit_logs WHERE project_id = ANY(${projectIds})
      `
    }
    await sql`
      DELETE FROM public.audit_logs WHERE user_id = ${userId}
    `
    await sql`
      DELETE FROM public.projects WHERE user_id = ${userId}
    `

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('[v0] Supabase user deletion failed:', deleteError.message)
      return NextResponse.json({ error: 'Unable to delete account' }, { status: 500 })
    }

    const cookieStore = await cookies()
    cookieStore.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[v0] account deletion failed', error)
    return NextResponse.json({ error: 'Unable to delete account' }, { status: 500 })
  }
}
