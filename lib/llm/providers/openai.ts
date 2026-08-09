import { generateObject, embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
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

export class OpenAIProvider implements LLMProvider {
  private model: string;
  private client: ReturnType<typeof createOpenAI>;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = createOpenAI({ apiKey });
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
          `OpenAI API key is invalid or expired. ` +
          `Update your key in Settings > LLM Providers.`
        );
      }

      if (classified.type === 'rate_limit') {
        throw new Error(
          `OpenAI rate limit exceeded for ${this.model}. ` +
          `Wait a moment and try again, or switch to another provider.`
        );
      }

      if (classified.type === 'model_not_found') {
        throw new Error(
          `OpenAI model "${this.model}" not found. ` +
          `Check available models at https://platform.openai.com/docs/models.`
        );
      }

      throw new Error(`OpenAI analysis failed: ${classified.message}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    const embedding = await embed({
      model: this.client.embedding('text-embedding-3-small'),
      value: text,
    });
    return embedding.embedding;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.embed('test');
      return true;
    } catch {
      return false;
    }
  }
}
