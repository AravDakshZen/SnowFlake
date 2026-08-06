import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { fingerprintStackTrace, findDuplicateCluster } from '@/lib/fingerprint';
import { queueInvestigation } from '@/lib/queue';
import { getLLMProvider } from '@/lib/llm';
import { decryptValue } from '@/lib/encryption';

interface LogPayload {
  endpoint: string;
  method: string;
  statusCode: number;
  timestamp: string;
  stackTrace: string;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
  projectId: string;
}

async function validateApiKey(
  projectId: string,
  authHeader?: string
): Promise<{ valid: boolean; userId?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false };
  }

  const keyHash = require('crypto')
    .createHash('sha256')
    .update(authHeader.substring(7))
    .digest('hex');

  try {
    const sql = getSql();
    const result = await sql`
      SELECT ak.user_id, p.user_id as project_user_id
      FROM public.api_keys ak
      JOIN public.projects p ON ak.project_id = p.id
      WHERE ak.key_hash = ${keyHash}
      AND p.id = ${projectId}
      AND ak.revoked_at IS NULL
      LIMIT 1
    `;

    if (result.length > 0) {
      await sql`
        UPDATE public.api_keys
        SET last_used_at = NOW()
        WHERE key_hash = ${keyHash}
      `;

      return { valid: true, userId: result[0].project_user_id };
    }

    return { valid: false };
  } catch (error) {
    console.error('[v0] API key validation error:', error);
    return { valid: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload: LogPayload = await request.json();

    // Validate required fields
    const requiredFields = ['endpoint', 'method', 'statusCode', 'stackTrace', 'projectId'];
    const missingFields = requiredFields.filter((field) => !(field in payload));

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Missing required fields', missingFields },
        { status: 400 }
      );
    }

    // Validate API key
    const auth = await validateApiKey(payload.projectId, authHeader ?? undefined);
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getSql();

    // Get LLM config to generate embedding
    const llmConfigResult = await sql`
      SELECT provider, model, encrypted_key, base_url
      FROM public.llm_configs
      WHERE project_id = ${payload.projectId}
      LIMIT 1
    `;

    let embedding: number[] | null = null;
    let clusterId: string | null = null;
    let isDuplicate = false;

    if (llmConfigResult.length > 0) {
      const llmConfig = llmConfigResult[0];
      const decryptedKey = decryptValue(llmConfig.encrypted_key);

      try {
        const provider = await getLLMProvider(
          llmConfig.provider,
          decryptedKey,
          llmConfig.model,
          llmConfig.base_url
        );

        // Generate embedding
        embedding = await provider.embed(payload.stackTrace);

        // Find duplicate cluster
        const duplicate = await findDuplicateCluster(payload.projectId, embedding);

        if (duplicate) {
          clusterId = duplicate.clusterId;
          isDuplicate = true;
        }
      } catch (error) {
        console.error('[v0] Error generating embedding:', error);
      }
    }

    // Create or use existing cluster
    if (!clusterId) {
      const fingerprint = await fingerprintStackTrace(payload.stackTrace);

      const clusterResult = await sql`
        INSERT INTO public.clusters (
          project_id,
          user_id,
          fingerprint,
          title,
          level,
          status,
          environment
        )
        VALUES (
          ${payload.projectId},
          ${auth.userId},
          ${fingerprint},
          ${payload.endpoint},
          ${payload.statusCode >= 500 ? 'error' : 'warning'},
          'open',
          'production'
        )
        ON CONFLICT (project_id, fingerprint) DO UPDATE
        SET last_seen_at = NOW(), event_count = event_count + 1
        RETURNING id
      `;

      clusterId = clusterResult[0].id;
    } else {
      // Update existing cluster
      await sql`
        UPDATE public.clusters
        SET last_seen_at = NOW(), event_count = event_count + 1
        WHERE id = ${clusterId}
      `;
    }

    // Insert the log
    const logResult = await sql`
      INSERT INTO public.api_logs (
        project_id,
        user_id,
        cluster_id,
        endpoint,
        method,
        status_code,
        stack_trace,
        request_body,
        response_body,
        embedding
      )
      VALUES (
        ${payload.projectId},
        ${auth.userId},
        ${clusterId},
        ${payload.endpoint},
        ${payload.method},
        ${payload.statusCode},
        ${payload.stackTrace},
        ${JSON.stringify(payload.requestBody || {})},
        ${JSON.stringify(payload.responseBody || {})},
        ${embedding ? JSON.stringify(embedding) : null}
      )
      RETURNING id
    `;

    const logId = logResult[0].id;
    if (!clusterId) throw new Error('Failed to create an error cluster')

    // Queue investigation if not a duplicate and status code >= 400
    let investigationId: string | null = null;
    if (!isDuplicate && payload.statusCode >= 400) {
      try {
        await queueInvestigation({
          projectId: payload.projectId,
          logId,
          clusterId,
        });
      } catch (error) {
        console.error('[v0] Failed to queue investigation:', error);
      }
    }

    return NextResponse.json({
      logId,
      clusterId,
      isDuplicate,
      status: isDuplicate ? 'duplicate' : 'queued',
    });
  } catch (error) {
    console.error('[v0] Logs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
