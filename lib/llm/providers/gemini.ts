import { generateObject, embed } from 'ai';
import { google } from '@ai-sdk/google';
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

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
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
Identify the exact root cause, the affected file and line number, and generate a complete corrected version of the affected file.
Also return a unified diff patch. Return ONLY valid JSON.`;

    const userPrompt = `${previousContext}Stack trace:\n${stackTrace}\n\nSource files:\n${filesContext}`;

    const result = await withTimeout(
      generateObject({
        model: google(this.model),
        system: systemPrompt,
        prompt: userPrompt,
        schema: analysisSchema,
      })
    );

    return result.object;
  }

  async embed(text: string): Promise<number[]> {
    const embedding = await embed({
      model: google.embedding('text-embedding-004'),
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
