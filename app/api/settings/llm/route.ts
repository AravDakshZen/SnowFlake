import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { encryptValue, decryptValue } from '@/lib/encryption';
import { getLLMProvider } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const provider = String(body.provider || '').toLowerCase();
    const apiKey = String(body.apiKey ?? body.api_key ?? '');
    const model = String(body.model || '');
    const baseUrl = body.baseUrl ?? body.base_url ?? null;
    const sql = getSql();
    const requestedProjectId = body.projectId ?? body.project_id ?? null;
    const projectRows = requestedProjectId
      ? await sql`SELECT id FROM public.projects WHERE id = ${requestedProjectId} AND user_id = ${session.user.id} LIMIT 1`
      : await sql`SELECT id FROM public.projects WHERE user_id = ${session.user.id} ORDER BY created_at ASC LIMIT 1`;
    const projectId = projectRows[0]?.id as string | undefined;

    if (!provider || (!apiKey && provider !== 'ollama') || !model || !projectId) {
      return NextResponse.json({ error: 'Choose a provider and model. A project and provider key are required.' }, { status: 400 });
    }

    // Verify project ownership when a project id was supplied.
    if (requestedProjectId && projectRows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Test the LLM connection
    try {
      const llmProvider = await getLLMProvider(provider, apiKey, model, baseUrl);
      const startTime = Date.now();
      await llmProvider.isAvailable();
      const latencyMs = Date.now() - startTime;

      // Encrypt API key
      const encryptedKey = encryptValue(apiKey);

      // Save or update config
      const result = await sql`
        INSERT INTO public.llm_configs (
          project_id,
          user_id,
          provider,
          model,
          encrypted_key,
          base_url
        )
        VALUES (${projectId}, ${session.user.id}, ${provider}, ${model}, ${encryptedKey}, ${baseUrl || null})
        ON CONFLICT (project_id, provider) DO UPDATE
        SET model = ${model}, encrypted_key = ${encryptedKey}, base_url = ${baseUrl || null}
        RETURNING id, provider, model
      `;

      return NextResponse.json({
        provider,
        model,
        status: 'connected',
        latencyMs,
      });
    } catch (error) {
      console.error('[v0] LLM connection test failed:', error);
      return NextResponse.json(
        { error: 'Failed to connect to LLM provider' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[v0] LLM settings error:', error);
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
    const projectCheck = await sql`
      SELECT id FROM public.projects
      WHERE id = ${projectId} AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (projectCheck.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch LLM configs (without decrypted keys)
    const configs = await sql`
      SELECT
        id,
        provider,
        model,
        base_url,
        created_at
      FROM public.llm_configs
      WHERE project_id = ${projectId}
    `;

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('[v0] LLM settings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
