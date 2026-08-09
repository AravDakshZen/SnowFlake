import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateSeverity, calculateTrend } from '@/lib/severity';

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

    // Fetch clusters with event counts and trends
    const clusters = await sql`
      SELECT
        c.id,
        c.fingerprint,
        c.title,
        c.level,
        c.status,
        c.event_count,
        c.first_seen_at,
        c.last_seen_at,
        COUNT(al.id) as log_count,
        COUNT(DISTINCT i.id) as investigation_count,
        (
          SELECT i2.root_cause
          FROM public.investigations i2
          WHERE i2.cluster_id = c.id AND i2.status = 'failed'
          ORDER BY i2.created_at DESC
          LIMIT 1
        ) as latest_error
      FROM public.clusters c
      LEFT JOIN public.api_logs al ON c.id = al.cluster_id
      LEFT JOIN public.investigations i ON c.id = i.cluster_id
      WHERE c.project_id = ${projectId}
      GROUP BY c.id
      ORDER BY c.last_seen_at DESC
    `;

    // Enhance with severity scores
    const enhancedClusters = clusters.map((cluster) => {
      const severity = calculateSeverity({
        occurrenceCount: cluster.event_count,
        lastSeenAt: new Date(cluster.last_seen_at),
        statusCode: cluster.level === 'error' ? 500 : 400,
      });

      return {
        ...cluster,
        severity,
      };
    });

    return NextResponse.json({ clusters: enhancedClusters });
  } catch (error) {
    console.error('[v0] Clusters list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
