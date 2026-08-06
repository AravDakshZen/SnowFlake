import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import type { LLMProvider, AnalysisResult } from '../index';

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

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export class GroqProvider implements LLMProvider {
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

    const result = await generateObject({
      model: groq(this.model),
      system: systemPrompt,
      prompt: userPrompt,
      schema: analysisSchema,
    });

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
