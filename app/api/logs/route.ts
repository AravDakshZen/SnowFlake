import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { fingerprintStackTrace, findDuplicateCluster } from '@/lib/fingerprint';
import { queueInvestigation } from '@/lib/queue';
import { getLLMProvider } from '@/lib/llm';
import { decryptValue } from '@/lib/encryption';
import { emitToProject } from '@/lib/socket';
import { logAudit } from '@/lib/audit';

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

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function timingSafeEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

async function validateApiKey(
  projectId: string,
  authHeader?: string
): Promise<{ valid: boolean; userId?: string; message?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, message: 'Missing API key. Send a valid "Authorization: Bearer <key>" header.' };
  }

  const presentedKey = authHeader.substring(7).trim()
  const presentedHash = sha256Hex(presentedKey)

  try {
    const sql = getSql();
    const result = await sql`
      SELECT ak.id, ak.key_hash, ak.revoked_at, p.user_id as project_user_id
      FROM public.api_keys ak
      JOIN public.projects p ON ak.project_id = p.id
      WHERE ak.project_id = ${projectId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return { valid: false, message: 'No API key exists for this project.' };
    }

    const stored = result[0];
    if (stored.revoked_at) {
      return { valid: false, message: 'API key has been revoked. Generate a new one in Settings.' };
    }

    // Constant-time comparison in-process instead of a SQL equality query.
    const match = timingSafeEqual(presentedHash, stored.key_hash)
    if (!match) {
      return { valid: false, message: 'Invalid API key. Check your key in Settings and try again.' };
    }

    await sql`
      UPDATE public.api_keys
      SET last_used_at = NOW()
      WHERE id = ${stored.id}
    `;

    return { valid: true, userId: stored.project_user_id };
  } catch (error) {
    console.error('[v0] API key validation error:', error);
    return { valid: false, message: 'API key validation failed.' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload: LogPayload = await request.json();

    // Validate required fields
    const requiredFields: Record<string, (v: unknown) => boolean> = {
      endpoint: (v) => typeof v === 'string' && v.length > 0,
      method: (v) => typeof v === 'string' && v.length > 0,
      statusCode: (v) => typeof v === 'number' && v >= 100 && v <= 599,
      stackTrace: (v) => typeof v === 'string' && v.length > 0,
      timestamp: (v) => typeof v === 'string' && !isNaN(Date.parse(v)),
      projectId: (v) => typeof v === 'string' && v.length > 0,
    };

    const missingFields = Object.keys(requiredFields).filter(
      (field) => !(field in payload) || !requiredFields[field]((payload as unknown as Record<string, unknown>)[field])
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Missing or invalid fields', missingFields },
        { status: 400 }
      );
    }

    // Validate API key
    const auth = await validateApiKey(payload.projectId, authHeader ?? undefined);
    if (!auth.valid || !auth.userId) {
      return NextResponse.json(
        { error: auth.message ?? 'Unauthorized' },
        { status: 401 }
      );
    }

    const sql = getSql();

    emitToProject(payload.projectId, 'log:received', {
      logId: null,
      endpoint: payload.endpoint,
      statusCode: payload.statusCode,
      timestamp: payload.timestamp,
    });

    await logAudit(
      payload.projectId,
      'log_ingested',
      undefined,
      undefined,
      { endpoint: payload.endpoint, method: payload.method, statusCode: payload.statusCode },
      auth.userId
    );

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
    let fingerprintUsed: string | null = null;
    if (!clusterId) {
      const fingerprint = await fingerprintStackTrace(payload.stackTrace);
      fingerprintUsed = fingerprint;

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
        ${embedding ? `[${embedding.join(',')}]` : null}
      )
      RETURNING id
    `;

    const logId = logResult[0].id;
    if (!clusterId) throw new Error('Failed to create an error cluster')

    emitToProject(payload.projectId, 'log:fingerprinted', {
      logId,
      clusterId,
      fingerprint: fingerprintUsed ?? payload.endpoint,
    });

    await logAudit(
      payload.projectId,
      'log_ingested',
      'log',
      logId,
      { stage: 'fingerprinted', clusterId },
      auth.userId
    );

    // Queue investigation if not a duplicate and status code >= 400
    let investigationId: string | null = null;
    if (!isDuplicate && payload.statusCode >= 400) {
      try {
        const queued = await queueInvestigation({
          projectId: payload.projectId,
          logId,
          clusterId,
        });
        investigationId = queued?.investigationId ?? null;
      } catch (error) {
        console.error('[v0] Failed to queue investigation:', error);
        emitToProject(payload.projectId, 'investigation:queued', {
          logId,
          clusterId,
          status: 'failed',
          error: 'Failed to queue investigation',
        });
      }
    }

    if (investigationId) {
      emitToProject(payload.projectId, 'investigation:queued', {
        investigationId,
        logId,
        clusterId,
      });
      await logAudit(
        payload.projectId,
        'investigation_queued',
        'investigation',
        investigationId,
        { logId, clusterId },
        auth.userId
      );
    }

    return NextResponse.json({
      logId,
      clusterId,
      investigationId,
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
