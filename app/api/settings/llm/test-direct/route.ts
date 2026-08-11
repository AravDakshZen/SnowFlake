import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getLLMProvider } from '@/lib/llm';

const DUMMY_STACK_TRACE = `TypeError: Cannot read property 'map' of undefined
  at processArray (/app/lib/utils.ts:42:15)
  at async main (/app/index.ts:10:5)
  at processTicksAndRejections (internal/timers:eventEmitter)`;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey, model, baseUrl } = body;

    if (!provider) {
      return NextResponse.json(
        { error: 'provider is required' },
        { status: 400 }
      );
    }

    // Local Ollama (localhost) can only be tested when running locally, not on Vercel
    if (provider === 'ollama' && (!apiKey || !baseUrl || baseUrl.includes('localhost'))) {
      if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
        return NextResponse.json({
          status: 'failed',
          error: 'Local Ollama cannot be tested from the cloud. You can still save it and use it when running the app locally. Cloud mode (api.ollama.com) works from here.',
        }, { status: 400 });
      }
    }

    // For providers that require a key, check if key is provided
    const requiresKey = !['ollama'].includes(provider);
    if (requiresKey && !apiKey) {
      return NextResponse.json(
        { error: 'API key is required for this provider' },
        { status: 400 }
      );
    }

    try {
      const llmProvider = await getLLMProvider(
        provider,
        apiKey || '',
        model || '',
        baseUrl || undefined
      );

      const startTime = Date.now();

      // Test with a simple completion request
      const testPrompt = 'Say "hello" in one word.';
      
      // For providers that support embedding, test that
      // Ollama cloud mode also supports embedding
      const supportsEmbedding = provider !== 'ollama' || (provider === 'ollama' && apiKey);
      if (supportsEmbedding) {
        try {
          const embedding = await llmProvider.embed(testPrompt);
          const latency = Date.now() - startTime;
          return NextResponse.json({
            status: 'connected',
            provider,
            model,
            latencyMs: latency,
            message: 'Connection successful',
          });
        } catch {
          // If embedding fails, try a simple analysis
        }
      }

      // Test analysis
      const analysisStart = Date.now();
      const analysis = await llmProvider.analyze(DUMMY_STACK_TRACE, {
        'utils.ts': 'export function processArray(arr) { return arr.map(x => x * 2); }',
      });
      const analysisLatency = Date.now() - analysisStart;

      return NextResponse.json({
        status: 'connected',
        provider,
        model,
        latencyMs: analysisLatency,
        message: 'Connection successful',
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
