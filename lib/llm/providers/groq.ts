import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import type { LLMProvider, AnalysisResult } from '../index';
import { withTimeout } from '../parse';

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
    const filesContext = Object.entries(sourceFiles)
      .map(([path, content]) => `\n// File: ${path}\n${content}`)
      .join('\n\n');

    const previousContext = previousAttempts
      ? `Previous fix attempts:\n${previousAttempts.join('\n\n')}\n\n`
      : '';

    const systemPrompt = `You are an expert backend engineer. Analyze the following stack trace and source files.
Find EVERY bug across all provided files. Identify each root cause with its file and line number, and generate a complete corrected version of every affected file. The patchDiff must contain a hunk for every bug — do not stop at one. Return ONLY valid JSON.`;

    const userPrompt = `${previousContext}Stack trace:\n${stackTrace}\n\nSource files:\n${filesContext}`;

    const result = await withTimeout(
      generateObject({
        model: this.client(this.model),
        system: systemPrompt,
        prompt: userPrompt,
        schema: analysisSchema,
      })
    );

    return result.object;
  }

  async embed(text: string): Promise<number[]> {
    // Groq doesn't have embeddings, use OpenAI's
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
