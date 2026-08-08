import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Verify project ownership
    const projectCheck = await sql`
      SELECT id FROM public.projects
      WHERE id = ${projectId} AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (projectCheck.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch investigations with pagination. LEFT JOINs so investigations
    // created from automation events (no api_logs row, event_id instead of
    // log_id) are still listed, not silently dropped by an inner join.
    const investigations = await sql`
      SELECT
        i.id,
        i.question,
        i.summary,
        i.root_cause,
        i.affected_file,
        i.confidence,
        i.status,
        i.pr_url,
        i.pr_number,
        i.attempt,
        i.created_at,
        i.event_id,
        c.fingerprint,
        al.endpoint,
        al.method,
        al.status_code
      FROM public.investigations i
      LEFT JOIN public.clusters c ON i.cluster_id = c.id
      LEFT JOIN public.api_logs al ON i.log_id = al.id
      WHERE i.project_id = ${projectId}
      ORDER BY i.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM public.investigations
      WHERE project_id = ${projectId}
    `;

    return NextResponse.json({
      investigations,
      total: countResult[0].total,
      page,
      limit,
    });
  } catch (error) {
    console.error('[v0] Investigations list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
