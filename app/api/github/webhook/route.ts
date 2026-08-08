import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { queueInvestigation } from '@/lib/queue';
import { emitToProject } from '@/lib/socket';
import { logAudit } from '@/lib/audit';
import { sendEscalationAlert } from '@/lib/alerts';
import { resolveAppUrl } from '@/lib/config';
import { ensureWorkerRegistered } from '@/lib/worker-bootstrap';

const APP_URL = resolveAppUrl();

export async function POST(request: NextRequest) {
  try {
    ensureWorkerRegistered();
    const payload = await request.json();

    // GitHub webhook signature validation would go here in production
    // For now, we'll process the event

    const eventType = request.headers.get('x-github-event');

    if (eventType === 'workflow_run') {
      await handleWorkflowRun(payload);
    } else if (eventType === 'push') {
      console.log('[v0] Push event received:', payload.repository?.full_name);
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

function extractInvestigationPrefix(branch: string): string | null {
  // Branch format: snowflake/fix-<8hex>-<timestamp> (see worker + PR route)
  const match = branch.match(/^(?:snowflake|tracewise)\/fix-([a-f0-9]{1,8})(?:-|$)/);
  return match?.[1] ?? null;
}

async function handleWorkflowRun(payload: any) {
  try {
    const { workflow_run } = payload;

    // Only handle failures
    if (workflow_run?.conclusion !== 'failure') {
      return;
    }

    const headBranch = workflow_run?.head_branch ?? '';
    const investigationPrefix = extractInvestigationPrefix(headBranch);
    if (!investigationPrefix) {
      console.log('[v0] Non-Snowflake branch or malformed branch name, ignoring:', headBranch);
      return;
    }

    const sql = getSql();

    // Find the associated investigation by branch id prefix
    const investigation = await sql`
      SELECT
        id,
        project_id,
        log_id,
        cluster_id,
        attempt,
        pr_url
      FROM public.investigations
      WHERE left(id::text, 8) = ${investigationPrefix}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (investigation.length === 0) {
      return;
    }

    const inv = investigation[0];
    const attempt = (inv.attempt || 1) + 1;
    const projectId = inv.project_id;

    // Only re-investigate up to 3 times; on the final failure, escalate.
    if (attempt > 3) {
      console.log(`[v0] Max re-investigation attempts reached for ${inv.id}, escalating`);

      const alertConfig = await sql`
        SELECT slack_webhook_url, email_address
        FROM public.alert_configs
        WHERE project_id = ${projectId}
        LIMIT 1
      `;

      const existing = await sql`
        SELECT root_cause FROM public.investigations
        WHERE id = ${inv.id} OR parent_investigation_id = ${inv.id}
        ORDER BY attempt ASC
      `;
      const previousRootCauses = existing.map((e) => e.root_cause).filter(Boolean);

      const dashboardUrl = `${APP_URL}/investigations/${inv.id}`;
      if (alertConfig.length > 0) {
        const config = alertConfig[0];
        await sendEscalationAlert(
          config.slack_webhook_url,
          config.email_address,
          inv.id,
          `CI still failing after 3 attempts for branch ${headBranch}`,
          dashboardUrl,
          {
            attemptCount: 3,
            branchName: headBranch,
            previousRootCauses,
            ciRunId: workflow_run?.id ?? undefined,
            ciLogUrl: workflow_run?.html_url ?? undefined,
          }
        );
      }

      await logAudit(
        projectId,
        'escalation_fired',
        'investigation',
        inv.id,
        { reason: 'Max attempts reached', attempts: 3, branchName: headBranch },
        undefined
      );

      emitToProject(projectId, 'alert:escalated', {
        investigationId: inv.id,
        branchName: headBranch,
        reason: 'Max re-investigation attempts reached',
      });

      await sql`
        UPDATE public.investigations
        SET status = 'escalated'
        WHERE id = ${inv.id}
      `.catch(() => {});
      return;
    }

    console.log(`[v0] CI failed for Snowflake fix, re-investigating (attempt ${attempt})`);

    const queued = await queueInvestigation({
      projectId,
      logId: inv.log_id,
      clusterId: inv.cluster_id,
      parentInvestigationId: inv.id,
      attempt,
    });

    emitToProject(projectId, 'ci:failed_reinvestigating', {
      investigationId: inv.id,
      newInvestigationId: queued.investigationId,
      attempt,
      branchName: headBranch,
    });

    await logAudit(
      projectId,
      'reinvestigation_triggered',
      'investigation',
      inv.id,
      { newInvestigationId: queued.investigationId, attempt, branchName: headBranch },
      undefined
    );
  } catch (error) {
    console.error('[v0] Error handling workflow run:', error);
  }
}