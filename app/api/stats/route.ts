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

    // Get total logs
    const logsResult = await sql`
      SELECT COUNT(*) as total
      FROM public.api_logs
      WHERE project_id = ${projectId}
    `;

    // Get total investigations
    const investigationsResult = await sql`
      SELECT COUNT(*) as total
      FROM public.investigations
      WHERE project_id = ${projectId}
    `;

    // Get PRs opened
    const prsResult = await sql`
      SELECT COUNT(*) as total
      FROM public.investigations
      WHERE project_id = ${projectId}
      AND pr_url IS NOT NULL
    `;

    // Get average confidence
    const confidenceResult = await sql`
      SELECT AVG(confidence) as avg_confidence
      FROM public.investigations
      WHERE project_id = ${projectId}
      AND confidence > 0
    `;

    // Get duplicate detection stats
    const duplicatesResult = await sql`
      SELECT COUNT(DISTINCT al.cluster_id) as clusters,
        COUNT(*) as total_logs
      FROM public.api_logs al
      WHERE al.project_id = ${projectId}
    `;

    // Get top failing endpoints
    const topEndpointsResult = await sql`
      SELECT
        al.endpoint,
        al.method,
        al.status_code,
        COUNT(*) as count
      FROM public.api_logs al
      WHERE al.project_id = ${projectId}
      GROUP BY al.endpoint, al.method, al.status_code
      ORDER BY count DESC
      LIMIT 5
    `;

    // Get error trend (last 30 days)
    const trendResult = await sql`
      SELECT
        DATE_TRUNC('day', al.created_at)::date as date,
        COUNT(*) as count
      FROM public.api_logs al
      WHERE al.project_id = ${projectId}
      AND al.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', al.created_at)
      ORDER BY date DESC
    `;

    const duplicatesAvoided = duplicatesResult[0]
      ? duplicatesResult[0].total_logs - duplicatesResult[0].clusters
      : 0;

    return NextResponse.json({
      totalLogs: logsResult[0].total,
      totalInvestigations: investigationsResult[0].total,
      prsOpened: prsResult[0].total,
      avgConfidence: Math.round(confidenceResult[0].avg_confidence || 0),
      duplicatesAvoided,
      topFailingEndpoints: topEndpointsResult,
      errorTrend: trendResult,
    });
  } catch (error) {
    console.error('[v0] Stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
