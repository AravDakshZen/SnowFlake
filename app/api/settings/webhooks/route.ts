import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWebhooks } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId required' },
        { status: 400 }
      )
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('userId', session.user.id)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      )
    }

    const webhooks = await getWebhooks(projectId)
    return NextResponse.json({ webhooks })
  } catch (error) {
    console.error('[v0] Webhooks fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { projectId, url, secret, events } = body

    if (!projectId || !url || !secret || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('userId', session.user.id)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      )
    }

    // Save webhook
    const { data: webhook, error: saveError } = await supabase
      .from('outbound_webhooks')
      .insert({
        projectId,
        url,
        secret,
        events,
      })
      .select()
      .single()

    if (saveError) {
      return NextResponse.json(
        { error: 'Failed to save webhook' },
        { status: 500 }
      )
    }

    // Audit log
    await logAudit(
      projectId,
      'webhook_delivered',
      'webhook',
      webhook.id,
      { url, events: events.length },
      session.user.id
    )

    return NextResponse.json({
      webhook,
      status: 'created',
    })
  } catch (error) {
    console.error('[v0] Webhook creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
