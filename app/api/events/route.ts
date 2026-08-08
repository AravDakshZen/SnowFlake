import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { queueEventAnalysis } from '@/lib/queue';
import { ensureWorkerRegistered } from '@/lib/worker-bootstrap';
import { emitToProject } from '@/lib/socket';
import { logAudit } from '@/lib/audit';

function parseEventFields(body: Record<string, unknown>) {
  const name = String(body.name ?? '').trim();
  const repoOwner = String(body.repoOwner ?? body.repo_owner ?? '').trim();
  const repoName = String(body.repoName ?? body.repo_name ?? '').trim();
  const defaultBranch = String(body.defaultBranch ?? body.default_branch ?? 'main').trim() || 'main';
  const fixProvider = (body.fixProvider ?? body.fix_provider ?? null) as string | null;
  const fixModel = (body.fixModel ?? body.fix_model ?? null) as string | null;
  const commitProvider = (body.commitProvider ?? body.commit_provider ?? null) as string | null;
  const commitModel = (body.commitModel ?? body.commit_model ?? null) as string | null;
  const triggerNow = body.triggerNow ?? body.trigger_now ?? true;
  return { name, repoOwner, repoName, defaultBranch, fixProvider, fixModel, commitProvider, commitModel, triggerNow };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, repoOwner, repoName, defaultBranch, fixProvider, fixModel, commitProvider, commitModel, triggerNow } =
      parseEventFields(body);

    const sql = getSql();
    const projectId = String(body.projectId ?? body.project_id ?? '');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    if (!name || !repoOwner || !repoName) {
      return NextResponse.json({ error: 'Event name, repo owner and repo name are required.' }, { status: 400 });
    }

    const projectCheck = await sql`
      SELECT id FROM public.projects
      WHERE id = ${projectId} AND user_id = ${session.user.id}
      LIMIT 1
    `;
    if (projectCheck.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const created = await sql`
      INSERT INTO public.automation_events (
        project_id,
        user_id,
        name,
        repo_owner,
        repo_name,
        default_branch,
        fix_provider,
        fix_model,
        commit_provider,
        commit_model,
        status
      )
      VALUES (
        ${projectId},
        ${session.user.id},
        ${name},
        ${repoOwner},
        ${repoName},
        ${defaultBranch},
        ${fixProvider || null},
        ${fixModel || null},
        ${commitProvider || null},
        ${commitModel || null},
        'idle'
      )
      RETURNING id, name, repo_owner, repo_name, default_branch, fix_provider, fix_model, commit_provider, commit_model, status, last_commit_sha, created_at
    `;

    const event = created[0];

    emitToProject(projectId, 'event:created', {
      eventId: event.id,
      name: event.name,
      repo: `${event.repo_owner}/${event.repo_name}`,
      message: `Event "${event.name}" created for ${event.repo_owner}/${event.repo_name}`,
    });

    await logAudit(
      projectId,
      'event_created',
      'automation_event',
      event.id,
      { name, repoOwner, repoName, fixProvider, fixModel, commitProvider, commitModel },
      session.user.id
    );

    if (triggerNow) {
      ensureWorkerRegistered();
      await queueEventAnalysis({ projectId, eventId: event.id });
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('[v0] Events create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const sql = getSql();

    const projectCheck = await sql`
      SELECT id FROM public.projects
      WHERE id = ${projectId} AND user_id = ${session.user.id}
      LIMIT 1
    `;
    if (projectCheck.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const events = await sql`
      SELECT
        id,
        name,
        repo_owner,
        repo_name,
        default_branch,
        fix_provider,
        fix_model,
        commit_provider,
        commit_model,
        status,
        last_commit_sha,
        last_run_at,
        error,
        created_at
      FROM public.automation_events
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ events });
  } catch (error) {
    console.error('[v0] Events list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
