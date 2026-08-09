import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import type { LLMProvider, AnalysisResult } from '../index';
import { withTimeout } from '../parse';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt, classifyError } from '../prompt';

const analysisSchema = z.object({
  rootCause: z.string(),
  affectedFile: z.string(),
  affectedLine: z.number(),
  suggestedFix: z.string(),
  patchDiff: z.string(),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
  fixStrategy: z.enum(['one-liner', 'refactor', 'dependency-update', 'config-change']),
});

export class AnthropicProvider implements LLMProvider {
  private model: string;
  private client: ReturnType<typeof createAnthropic>;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = createAnthropic({ apiKey });
  }

  async analyze(
    stackTrace: string,
    sourceFiles: Record<string, string>,
    previousAttempts?: string[]
  ): Promise<AnalysisResult> {
    const userPrompt = buildAnalysisPrompt({ stackTrace, sourceFiles, previousAttempts });

    const run = async () => {
      const result = await withTimeout(
        generateObject({
          model: this.client(this.model),
          system: ANALYSIS_SYSTEM_PROMPT,
          prompt: userPrompt,
          schema: analysisSchema,
        })
      );
      return result.object;
    };

    try {
      return await run();
    } catch (error) {
      const classified = classifyError(error);

      if (classified.type === 'auth') {
        throw new Error(
          `Anthropic API key is invalid or expired. ` +
          `Update your key in Settings > LLM Providers.`
        );
      }

      if (classified.type === 'rate_limit') {
        throw new Error(
          `Anthropic rate limit exceeded for ${this.model}. ` +
          `Wait and retry, or switch to another provider.`
        );
      }

      if (classified.type === 'model_not_found') {
        throw new Error(
          `Anthropic model "${this.model}" not found. ` +
          `Check available models at https://docs.anthropic.com/claude/docs/models.`
        );
      }

      throw new Error(`Anthropic analysis failed: ${classified.message}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    // Anthropic doesn't have native embeddings, use a dummy implementation
    // In production, use a dedicated embedding service
    const hash = require('crypto')
      .createHash('sha256')
      .update(text)
      .digest();
    return Array.from(new Uint8Array(hash)).map((b) => b / 255);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await withTimeout(
        generateObject({
          model: this.client(this.model),
          system: 'Reply with "ok".',
          prompt: 'test',
          schema: z.object({ ok: z.string() }),
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}
