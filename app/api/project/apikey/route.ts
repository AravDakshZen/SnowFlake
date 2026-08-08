import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';

type Sql = ReturnType<typeof getSql>;

function generateApiKey(): string {
  const random = crypto.randomBytes(32).toString('hex');
  return `sf_live_${random}`;
}

function maskApiKey(apiKey: string): string {
  return apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
}

async function fetchKeys(sql: Sql, projectId: string) {
  const rows = await sql`
    SELECT id, key_prefix, created_at, revoked_at
    FROM public.api_keys
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
  `;
  return rows.map((key) => ({
    id: key.id,
    keyPrefix: key.key_prefix,
    maskedKey: maskApiKey(key.key_prefix),
    createdAt: key.created_at,
    revokedAt: key.revoked_at,
  }));
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

    return NextResponse.json({
      keys: await fetchKeys(sql, projectId),
    });
  } catch (error) {
    console.error('[v0] API key fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, action } = body;

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

    if (action === 'regenerate') {
      // Revoke old key
      await sql`
        UPDATE public.api_keys
        SET revoked_at = NOW()
        WHERE project_id = ${projectId}
      `;

      // Generate new key
      const newKey = generateApiKey();
      const keyHash = crypto.createHash('sha256').update(newKey).digest('hex');

      const result = await sql`
        INSERT INTO public.api_keys (
          project_id,
          user_id,
          name,
          key_prefix,
          key_hash
        )
        VALUES (
          ${projectId},
          ${session.user.id},
          'Default',
          ${newKey.substring(0, 20)},
          ${keyHash}
        )
        RETURNING key_prefix
      `;

      const keys = await fetchKeys(sql, projectId);

      return NextResponse.json({
        apiKey: newKey,
        maskedKey: maskApiKey(newKey),
        keys,
        message: 'API key regenerated. Store it safely – you won\'t be able to see it again.',
      });
    }

    if (action === 'revoke') {
      const { keyId } = body;
      if (!keyId) {
        return NextResponse.json(
          { error: 'keyId is required' },
          { status: 400 }
        );
      }

      await sql`
        UPDATE public.api_keys
        SET revoked_at = NOW()
        WHERE id = ${keyId}
        AND project_id = ${projectId}
      `;

      return NextResponse.json({
        keys: await fetchKeys(sql, projectId),
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[v0] API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
