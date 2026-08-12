import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { queueEventAnalysis } from '@/lib/queue';
import { ensureWorkerRegistered } from '@/lib/worker-bootstrap';
import { emitToProject } from '@/lib/socket';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const sql = getSql();

    const eventCheck = await sql`
      SELECT id, project_id, name, repo_owner, repo_name, status
      FROM public.automation_events
      WHERE id = ${id} AND user_id = ${session.user.id}
      LIMIT 1
    `;
    if (eventCheck.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const triggerNow = body.triggerNow ?? body.trigger_now ?? false;
    const updated = await sql`
      UPDATE public.automation_events
      SET
        name = COALESCE(${body.name ?? null}, name),
        fix_provider = COALESCE(${body.fixProvider ?? body.fix_provider ?? null}, fix_provider),
        fix_model = COALESCE(${body.fixModel ?? body.fix_model ?? null}, fix_model),
        commit_provider = COALESCE(${body.commitProvider ?? body.commit_provider ?? null}, commit_provider),
        commit_model = COALESCE(${body.commitModel ?? body.commit_model ?? null}, commit_model),
        status = CASE WHEN ${triggerNow} THEN 'idle' ELSE status END,
        error = NULL
      WHERE id = ${id}
      RETURNING id, name, repo_owner, repo_name, default_branch, fix_provider, fix_model, commit_provider, commit_model, category_ids, status, last_commit_sha, error, created_at
    `;

    const event = updated[0];

    await logAudit(
      eventCheck[0].project_id,
      'event_updated',
      'automation_event',
      event.id,
      { name: body.name ?? null, triggerNow },
      session.user.id
    );

    if (triggerNow) {
      emitToProject(eventCheck[0].project_id, 'event:started', {
        eventId: event.id,
        name: event.name,
        repo: `${event.repo_owner}/${event.repo_name}`,
        message: `Re-running event "${event.name}"`,
      });
      ensureWorkerRegistered();
      await queueEventAnalysis({ projectId: eventCheck[0].project_id, eventId: event.id });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('[v0] Event update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getSql();

    const deleted = await sql`
      DELETE FROM public.automation_events
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id, project_id, name
    `;
    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    emitToProject(deleted[0].project_id, 'event:deleted', {
      eventId: deleted[0].id,
      name: deleted[0].name,
      message: `Event "${deleted[0].name}" deleted`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Event delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
