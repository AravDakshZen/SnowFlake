import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { encryptValue, decryptValue } from '@/lib/encryption';
import { getLLMProvider } from '@/lib/llm';
import { logAudit } from '@/lib/audit';

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
    const isDefault = Boolean(body.isDefault ?? body.is_default ?? false);
    const configId = String(body.configId ?? body.config_id ?? '');
    const sql = getSql();
    const requestedProjectId = body.projectId ?? body.project_id ?? null;
    const projectRows = requestedProjectId
      ? await sql`SELECT id FROM public.projects WHERE id = ${requestedProjectId} AND user_id = ${session.user.id} LIMIT 1`
      : await sql`SELECT id FROM public.projects WHERE user_id = ${session.user.id} ORDER BY created_at ASC LIMIT 1`;
    const projectId = projectRows[0]?.id as string | undefined;

    // When editing an existing config, the API key may be left blank to keep
    // the stored one. Look up the existing encrypted key before validating.
    let resolvedApiKey = apiKey;
    if (!resolvedApiKey && projectId) {
      const existing = configId
        ? await sql`SELECT encrypted_key FROM public.llm_configs WHERE id = ${configId} AND user_id = ${session.user.id} LIMIT 1`
        : await sql`SELECT encrypted_key FROM public.llm_configs WHERE project_id = ${projectId} AND provider = ${provider} AND user_id = ${session.user.id} LIMIT 1`;
      if (existing.length > 0 && existing[0].encrypted_key) {
        resolvedApiKey = decryptValue(existing[0].encrypted_key);
      }
    }

    if (!provider || (!resolvedApiKey && provider !== 'ollama') || !model || !projectId) {
      return NextResponse.json({ error: 'Choose a provider and model. A project and provider key are required.' }, { status: 400 });
    }

    // Verify project ownership when a project id was supplied.
    if (requestedProjectId && projectRows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let latencyMs: number;
    try {
      const llmProvider = await getLLMProvider(provider, resolvedApiKey, model, baseUrl);
      const startTime = Date.now();
      await llmProvider.isAvailable();
      latencyMs = Date.now() - startTime;
    } catch (error) {
      console.error('[v0] LLM connection test failed:', error);
      const detail = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { error: 'Failed to connect to LLM provider', detail: detail.slice(0, 300) },
        { status: 400 }
      );
    }

    try {
      // Encrypt API key (or reuse the stored key when editing with a blank field)
      const encryptedKey = apiKey ? encryptValue(apiKey) : (
        configId
          ? (await sql`SELECT encrypted_key FROM public.llm_configs WHERE id = ${configId} AND user_id = ${session.user.id} LIMIT 1`)[0]?.encrypted_key
          : null
      );

      if (!encryptedKey) {
        return NextResponse.json({ error: 'API key is required' }, { status: 400 });
      }

      // Save or update config
      const result = await sql`
        INSERT INTO public.llm_configs (
          project_id,
          user_id,
          provider,
          model,
          encrypted_key,
          base_url,
          is_default
        )
        VALUES (${projectId}, ${session.user.id}, ${provider}, ${model}, ${encryptedKey}, ${baseUrl || null}, ${isDefault})
        ON CONFLICT (project_id, provider) DO UPDATE
        SET model = ${model}, encrypted_key = ${encryptedKey}, base_url = ${baseUrl || null}
        RETURNING id, provider, model
      `;

      if (isDefault) {
        await sql`
          UPDATE public.llm_configs
          SET is_default = (provider = ${provider})
          WHERE project_id = ${projectId}
        `;
      }

      await logAudit(
        projectId,
        'llm_key_updated',
        'llm_config',
        result[0].id,
        { provider, model, isDefault },
        session.user.id
      );

      return NextResponse.json({
        provider,
        model,
        isDefault,
        status: 'connected',
        latencyMs,
      });
    } catch (error) {
      console.error('[v0] LLM config save failed:', error);
      return NextResponse.json(
        { error: 'Failed to save LLM configuration' },
        { status: 500 }
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const sql = getSql();
    const configId = String(body.id || '');
    const isDefault = Boolean(body.isDefault ?? body.is_default ?? false);

    if (!configId) {
      return NextResponse.json({ error: 'config id is required' }, { status: 400 });
    }

    const projectCheck = await sql`
      SELECT id FROM public.projects
      WHERE user_id = ${session.user.id}
      LIMIT 1
    `;
    if (projectCheck.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const projectId = projectCheck[0].id as string;

    if (body.isDefault !== undefined) {
      if (isDefault) {
        await sql`
          UPDATE public.llm_configs
          SET is_default = false
          WHERE project_id = ${projectId}
        `;
        await sql`
          UPDATE public.llm_configs
          SET is_default = true
          WHERE id = ${configId} AND project_id = ${projectId}
        `;
      } else {
        await sql`
          UPDATE public.llm_configs
          SET is_default = false
          WHERE id = ${configId} AND project_id = ${projectId}
        `;
      }
    }

    await logAudit(
      projectId,
      'llm_key_default_toggled',
      'llm_config',
      configId,
      { isDefault },
      session.user.id
    );

    return NextResponse.json({ success: true, isDefault });
  } catch (error) {
    console.error('[v0] LLM settings PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');
    const sql = getSql();

    if (!configId) {
      return NextResponse.json({ error: 'config id is required' }, { status: 400 });
    }

    const deleted = await sql`
      DELETE FROM public.llm_configs
      WHERE id = ${configId} AND user_id = ${session.user.id}
      RETURNING id, provider, is_default
    `;

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (deleted[0].is_default) {
      await sql`
        UPDATE public.llm_configs
        SET is_default = true
        WHERE project_id = (
          SELECT project_id FROM public.llm_configs WHERE id = ${configId}
        )
        AND id <> ${configId}
        ORDER BY created_at ASC
        LIMIT 1
      `.catch(() => {});
    }

    await logAudit(
      (deleted as any).project_id ?? '',
      'llm_key_removed',
      'llm_config',
      configId,
      { provider: deleted[0].provider },
      session.user.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] LLM settings DELETE error:', error);
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

    // Fetch LLM configs (with masked keys for display)
    const configs = await sql`
      SELECT
        id,
        provider,
        model,
        base_url,
        encrypted_key,
        is_default,
        created_at
      FROM public.llm_configs
      WHERE project_id = ${projectId}
    `;

    const maskedConfigs = configs.map((config: any) => {
      let maskedKey: string | null = null
      if (config.encrypted_key) {
        try {
          const plain = decryptValue(config.encrypted_key)
          maskedKey = plain.length > 10 ? `${plain.slice(0, 6)}...${plain.slice(-4)}` : '••••••••'
        } catch {
          maskedKey = null
        }
      }
      return {
        id: config.id,
        provider: config.provider,
        model: config.model,
        base_url: config.base_url,
        is_default: Boolean(config.is_default),
        created_at: config.created_at,
        maskedKey,
      }
    })

    return NextResponse.json({ configs: maskedConfigs });
  } catch (error) {
    console.error('[v0] LLM settings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
