import { generateObject } from 'ai';
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

export class GroqProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private client: ReturnType<typeof createOpenAI>;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.client = createOpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
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
          `Groq API key is invalid or expired. ` +
          `Update your key in Settings > LLM Providers.`
        );
      }

      if (classified.type === 'rate_limit') {
        throw new Error(
          `Groq rate limit exceeded for ${this.model}. ` +
          `Free tier: 30 RPM. Wait and retry, or switch provider.`
        );
      }

      if (classified.type === 'model_not_found') {
        throw new Error(
          `Groq model "${this.model}" not found. ` +
          `Check available models at https://console.groq.com/docs/models.`
        );
      }

      throw new Error(`Groq analysis failed: ${classified.message}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(text).digest();
    return Array.from(new Uint8Array(hash.slice(0, 1536))).map((b) => b / 255);
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
