import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

function createApiKey() {
  const value = `tw_live_${crypto.randomBytes(24).toString('hex')}`
  return { value, hash: crypto.createHash('sha256').update(value).digest('hex') }
}

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = getSql()
    let projects = await sql`
      SELECT id, name, slug, environment, created_at
      FROM public.projects
      WHERE user_id = ${session.user.id}
      ORDER BY created_at ASC
      LIMIT 1
    `

    if (!projects.length) {
      const projectId = crypto.randomUUID()
      const projectName = `${session.user.name || 'My'} workspace`
      const slug = `workspace-${session.user.id.slice(0, 8)}`
      await sql`
        INSERT INTO public.projects (id, user_id, name, slug, environment)
        VALUES (${projectId}, ${session.user.id}, ${projectName}, ${slug}, 'production')
      `
      const apiKey = createApiKey()
      await sql`
        INSERT INTO public.api_keys (project_id, user_id, name, key_prefix, key_hash)
        VALUES (${projectId}, ${session.user.id}, 'Default', ${apiKey.value.slice(0, 20)}, ${apiKey.hash})
      `
      projects = await sql`
        SELECT id, name, slug, environment, created_at
        FROM public.projects WHERE id = ${projectId} LIMIT 1
      `
    }

    return NextResponse.json({ project: projects[0] })
  } catch (error) {
    console.error('[v0] current project failed', error)
    return NextResponse.json({ error: 'Project storage is not ready' }, { status: 503 })
  }
}
