import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, slackWebhookUrl, emailAddress, alertOn } = body;

    if (!projectId || !Array.isArray(alertOn)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Verify project ownership
    const project = await sql`
      SELECT id FROM public.projects
      WHERE id = ${projectId}
      AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (project.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Save or update alert config
    const result = await sql`
      INSERT INTO public.alert_configs (
        project_id,
        user_id,
        slack_webhook_url,
        email_address,
        alert_on
      )
      VALUES (
        ${projectId},
        ${session.user.id},
        ${slackWebhookUrl || null},
        ${emailAddress || null},
        ${JSON.stringify(alertOn)}
      )
      ON CONFLICT (project_id) DO UPDATE
      SET slack_webhook_url = ${slackWebhookUrl || null},
        email_address = ${emailAddress || null},
        alert_on = ${JSON.stringify(alertOn)}
      RETURNING id
    `;

    return NextResponse.json({ configId: result[0].id });
  } catch (error) {
    console.error('[v0] Alert settings error:', error);
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

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Verify project ownership
    const project = await sql`
      SELECT id FROM public.projects
      WHERE id = ${projectId}
      AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (project.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch alert config
    const config = await sql`
      SELECT
        id,
        slack_webhook_url,
        email_address,
        alert_on,
        created_at
      FROM public.alert_configs
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    return NextResponse.json({
      config: config.length > 0 ? config[0] : null,
    });
  } catch (error) {
    console.error('[v0] Alert settings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
