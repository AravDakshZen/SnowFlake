import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { decryptValue } from '@/lib/encryption';
import { getLLMProvider } from '@/lib/llm';

const DUMMY_STACK_TRACE = `TypeError: Cannot read property 'map' of undefined
  at processArray (/app/lib/utils.ts:42:15)
  at async main (/app/index.ts:10:5)
  at processTicksAndRejections (internal/timers:eventEmitter)`;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const provider = searchParams.get('provider');

    if (!projectId || !provider) {
      return NextResponse.json(
        { error: 'projectId and provider are required' },
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

    // Get LLM config
    const configResult = await sql`
      SELECT
        provider,
        model,
        encrypted_key,
        base_url
      FROM public.llm_configs
      WHERE project_id = ${projectId}
      AND provider = ${provider}
      LIMIT 1
    `;

    if (configResult.length === 0) {
      return NextResponse.json(
        { error: 'LLM provider not configured' },
        { status: 404 }
      );
    }

    const config = configResult[0];
    const decryptedKey = decryptValue(config.encrypted_key);

    // Run test
    try {
      const llmProvider = await getLLMProvider(
        config.provider,
        decryptedKey,
        config.model,
        config.base_url
      );

      const startTime = Date.now();

      // Test embedding
      const embedding = await llmProvider.embed(DUMMY_STACK_TRACE);
      const embeddingLatency = Date.now() - startTime;

      // Test analysis (simplified)
      const analysisStart = Date.now();
      const analysis = await llmProvider.analyze(DUMMY_STACK_TRACE, {
        'utils.ts': 'export function processArray(arr) { return arr.map(x => x * 2); }',
      });
      const analysisLatency = Date.now() - analysisStart;

      return NextResponse.json({
        status: 'connected',
        provider: config.provider,
        model: config.model,
        embedding: {
          latencyMs: embeddingLatency,
          dimensionality: embedding.length,
        },
        analysis: {
          latencyMs: analysisLatency,
          confidence: analysis.confidence,
          rootCause: analysis.rootCause.substring(0, 100) + '...',
        },
      });
    } catch (error) {
      console.error('[v0] LLM test error:', error);
      return NextResponse.json(
        {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Test failed',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[v0] LLM test route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
