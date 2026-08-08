import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getSql();

    // Fetch investigation with full details
    const investigation = await sql`
      SELECT
        i.id,
        i.root_cause,
        i.affected_file,
        i.affected_line,
        i.patch_diff,
        i.confidence,
        i.status,
        i.pr_url,
        i.pr_number,
        i.attempt,
        i.explanation,
        i.fix_strategy,
        i.created_at,
        al.stack_trace,
        al.request_body,
        al.response_body,
        c.fingerprint
      FROM public.investigations i
      LEFT JOIN public.api_logs al ON i.log_id = al.id
      LEFT JOIN public.clusters c ON i.cluster_id = c.id
      WHERE i.id = ${id}
      AND i.user_id = ${session.user.id}
      LIMIT 1
    `;

    if (investigation.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch related investigation attempts
    const attempts = await sql`
      SELECT
        id,
        root_cause,
        confidence,
        patch_diff,
        status,
        created_at,
        attempt
      FROM public.investigations
      WHERE id = ${id} OR parent_investigation_id = ${id}
      ORDER BY attempt ASC
    `;

    return NextResponse.json({
      investigation: investigation[0],
      attempts,
    });
  } catch (error) {
    console.error('[v0] Investigation detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const sql = getSql();

    // Verify ownership
    const invCheck = await sql`
      SELECT id FROM public.investigations
      WHERE id = ${id} AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (invCheck.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Update investigation status / editable patch fields
    const updated = await sql`
      UPDATE public.investigations
      SET status = ${body.status ?? 'in_progress'},
        root_cause = COALESCE(${body.rootCause ?? null}, root_cause),
        affected_file = COALESCE(${body.affectedFile ?? null}, affected_file),
        affected_line = COALESCE(${body.affectedLine ?? null}, affected_line),
        patch_diff = COALESCE(${body.patchDiff ?? null}, patch_diff),
        explanation = COALESCE(${body.explanation ?? null}, explanation)
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('[v0] Investigation update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
