import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSql } from '@/lib/db'
import { getSnippets } from '@/lib/snippets'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const sql = getSql()
    const [project] = await sql`
      SELECT ak.key_prefix
      FROM public.projects p
      LEFT JOIN public.api_keys ak ON ak.project_id = p.id AND ak.user_id = p.user_id AND ak.revoked_at IS NULL
      WHERE p.id = ${projectId} AND p.user_id = ${session.user.id}
      ORDER BY ak.created_at DESC NULLS LAST
      LIMIT 1
    `
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    return NextResponse.json(getSnippets(project.key_prefix ?? ''))
  } catch (error) {
    console.error('[v0] Snippets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
