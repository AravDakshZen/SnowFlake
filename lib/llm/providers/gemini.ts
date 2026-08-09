import { generateObject, embed, generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
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

export class GeminiProvider implements LLMProvider {
  private model: string;
  private client: ReturnType<typeof createGoogleGenerativeAI>;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = createGoogleGenerativeAI({ apiKey });
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
          `Gemini API key is invalid or expired. ` +
          `Update your Google AI API key in Settings > LLM Providers. ` +
          `Get a free key at https://aistudio.google.com/apikey`
        );
      }

      if (classified.type === 'rate_limit') {
        throw new Error(
          `Gemini rate limit exceeded for ${this.model}. ` +
          `Wait a moment and try again, or switch to another provider.`
        );
      }

      if (classified.type === 'model_not_found') {
        throw new Error(
          `Gemini model "${this.model}" not found. ` +
          `It may have been renamed or removed. Try: gemini-2.5-flash, gemini-2.5-pro, or gemini-2.0-flash.`
        );
      }

      // Check for Google-specific auth errors that might not match standard patterns
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('oauth') || msg.includes('OAuth') || msg.includes('credentials')) {
        throw new Error(
          `Gemini API key is invalid or expired. ` +
          `Update your Google AI API key in Settings > LLM Providers. ` +
          `Get a free key at https://aistudio.google.com/apikey`
        );
      }

      throw new Error(`Gemini analysis failed: ${classified.message}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    const embedding = await embed({
      model: this.client.embedding('text-embedding-004'),
      value: text,
    });
    return embedding.embedding;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await withTimeout(
        generateText({
          model: this.client(this.model),
          prompt: 'Reply with OK',
          maxTokens: 5,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}
