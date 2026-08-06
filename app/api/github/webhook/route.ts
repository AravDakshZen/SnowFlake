import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { queueInvestigation } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // GitHub webhook signature validation would go here in production
    // For now, we'll process the event

    const eventType = request.headers.get('x-github-event');

    if (eventType === 'workflow_run') {
      // Handle CI failure and trigger re-investigation
      await handleWorkflowRun(payload);
    } else if (eventType === 'push') {
      // Handle push events if needed
      console.log('[v0] Push event received:', payload.repository.full_name);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] GitHub webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleWorkflowRun(payload: any) {
  try {
    const { workflow_run, repository } = payload;

    // Only handle failures
    if (workflow_run.conclusion !== 'failure') {
      return;
    }

    // Check if this is a Snowflake branch
    if (!workflow_run.head_branch.startsWith('snowflake/')) {
      return;
    }

    const sql = getSql();

    // Find the associated investigation by branch name
    const branch = workflow_run.head_branch;
    const investigationId = branch.split('-')[2]; // Extract ID from branch name

    if (!investigationId) {
      return;
    }

    // Get investigation details
    const investigation = await sql`
      SELECT
        id,
        log_id,
        cluster_id,
        attempt,
        pr_url
      FROM public.investigations
      WHERE id = ${investigationId}
      LIMIT 1
    `;

    if (investigation.length === 0) {
      return;
    }

    const inv = investigation[0];
    const attempt = (inv.attempt || 1) + 1;

    // Only re-investigate up to 3 times
    if (attempt > 3) {
      console.log(`[v0] Max re-investigation attempts reached for ${investigationId}`);
      return;
    }

    console.log(`[v0] CI failed for Snowflake fix, re-investigating (attempt ${attempt})`);

    // Queue new investigation
    await queueInvestigation({
      projectId: investigation[0].project_id,
      logId: inv.log_id,
      clusterId: inv.cluster_id,
      parentInvestigationId: inv.id,
    });
  } catch (error) {
    console.error('[v0] Error handling workflow run:', error);
  }
}
