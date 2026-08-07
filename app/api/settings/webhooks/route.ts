import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSql } from '@/lib/db'
import { getWebhooks } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'

async function ownedProject(projectId: string, userId: string) {
  const sql = getSql()
  return sql`SELECT id FROM public.projects WHERE id = ${projectId} AND user_id = ${userId} LIMIT 1`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    if (!(await ownedProject(projectId, session.user.id)).length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ webhooks: await getWebhooks(projectId) })
  } catch (error) {
    console.error('[v0] Webhooks fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { projectId, url, secret, events } = await request.json().catch(() => ({}))
    if (!projectId || !url || !secret || !Array.isArray(events)) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    if (!(await ownedProject(projectId, session.user.id)).length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const sql = getSql()
    const [webhook] = await sql`
      INSERT INTO public.outbound_webhooks (project_id, user_id, url, secret, events)
      VALUES (${projectId}, ${session.user.id}, ${url}, ${secret}, ${events})
      RETURNING *
    `
    await logAudit(projectId, 'webhook_delivered', 'webhook', webhook.id, { url, events: events.length }, session.user.id)
    return NextResponse.json({ webhook, status: 'created' })
  } catch (error) {
    console.error('[v0] Webhook creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
