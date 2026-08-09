import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { queueInvestigation } from '@/lib/queue';
import { ensureWorkerRegistered } from '@/lib/worker-bootstrap';
import { emitToProject } from '@/lib/socket';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const clusterId = String(body.cluster_id ?? body.clusterId ?? '').trim();
    const question = String(body.question ?? '').trim();

    if (!clusterId) {
      return NextResponse.json(
        { error: 'cluster_id is required' },
        { status: 400 }
      );
    }

    const sql = getSql();

    const clusterCheck = await sql`
      SELECT id, project_id
      FROM public.clusters
      WHERE id = ${clusterId} AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (clusterCheck.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const projectId = clusterCheck[0].project_id;

    const latestLog = await sql`
      SELECT id
      FROM public.api_logs
      WHERE cluster_id = ${clusterId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (latestLog.length === 0) {
      return NextResponse.json(
        { error: 'No log available for this cluster yet' },
        { status: 400 }
      );
    }

    ensureWorkerRegistered();
    const result = await queueInvestigation({
      projectId,
      logId: latestLog[0].id,
      clusterId,
      question: question || undefined,
    });

    if (result.status !== 'queued') {
      return NextResponse.json(
        { error: 'Unable to queue the investigation' },
        { status: 500 }
      );
    }

    await logAudit(
      projectId,
      'investigation_queued',
      'investigation',
      result.investigationId,
      { clusterId, question: question || null },
      session.user.id
    ).catch(() => {});

    emitToProject(projectId, 'investigation:queued', {
      investigationId: result.investigationId,
      clusterId,
      question: question || undefined,
    });

    return NextResponse.json(
      { investigationId: result.investigationId, status: 'queued' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Start investigation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
