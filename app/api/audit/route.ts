import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSql } from '@/lib/db'
import { getAuditLogs } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    const sql = getSql()
    const project = await sql`SELECT id FROM public.projects WHERE id = ${projectId} AND user_id = ${session.user.id} LIMIT 1`
    if (!project.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const action = request.nextUrl.searchParams.get('action')
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 50) || 50, 1), 100)
    const offset = Math.max(Number(request.nextUrl.searchParams.get('offset') ?? 0) || 0, 0)
    const { logs, total, hasMore } = await getAuditLogs(projectId, { action: action || undefined, limit, offset })
    return NextResponse.json({ logs, pagination: { total, limit, offset, hasMore } })
  } catch (error) {
    console.error('[v0] Audit logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
