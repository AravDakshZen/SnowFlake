import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSnippets } from '@/lib/snippets'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
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

    // Get project API key
    const { data: project, error } = await supabase
      .from('projects')
      .select('apiKeyMasked')
      .eq('id', projectId)
      .eq('userId', session.user.id)
      .single()

    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const snippets = getSnippets(project.apiKeyMasked)
    return NextResponse.json(snippets)
  } catch (error) {
    console.error('[v0] Snippets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
