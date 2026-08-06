import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { logAudit } from '@/lib/audit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    const { projectId } = body

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

    // Generate new API key
    const newKey = `tw_live_${crypto.randomBytes(32).toString('hex')}`
    const newKeyHash = crypto.createHash('sha256').update(newKey).digest('hex')
    const maskedKey = `${newKey.substring(0, 10)}...${newKey.substring(newKey.length - 4)}`

    // Update project
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        apiKeyHash: newKeyHash,
        apiKeyMasked: maskedKey,
      })
      .eq('id', projectId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update API key' },
        { status: 500 }
      )
    }

    // Audit log
    await logAudit(
      projectId,
      'api_key_regenerated',
      'project',
      projectId,
      { oldMasked: maskedKey },
      session.user.id
    )

    return NextResponse.json({
      apiKey: newKey,
      masked: maskedKey,
      message: 'Save your API key now. You won\'t be able to see it again.',
    })
  } catch (error) {
    console.error('[v0] API key regeneration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
