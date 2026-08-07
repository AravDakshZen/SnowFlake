import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { LLMProvider, AnalysisResult } from '../index'
import { parseAnalysisText, withTimeout, LLM_TIMEOUT_MS } from '../parse'

export class DeepInfraProvider implements LLMProvider {
  private client: any

  constructor(private apiKey: string, private model: string) {
    this.client = createOpenAI({
      apiKey,
      baseURL: 'https://api.deepinfra.com/v1/openai',
    })
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://api.deepinfra.com/v1/openai/models', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async embed(text: string): Promise<number[]> {
    const words = text.split(' ')
    const embedding = new Array(1536).fill(0)
    for (let i = 0; i < Math.min(words.length, embedding.length); i++) {
      embedding[i] = (words[i].charCodeAt(0) % 256) / 255
    }
    return embedding
  }

  async analyze(
    stackTrace: string,
    sourceFiles: Record<string, string>,
    previousAttempts?: string[]
  ): Promise<AnalysisResult> {
    const fileContext = Object.entries(sourceFiles)
      .map(([path, content]) => `File: ${path}\n${content}`)
      .join('\n\n')

    const previousContext = previousAttempts?.length
      ? `\n\nPrevious fix attempts failed. Learn from these:\n${previousAttempts.join('\n\n')}`
      : ''

    const run = async () => {
      const text = await generateText({
        model: this.client.chat(this.model),
        system: `You are a senior backend engineer. Given a stack trace and source files, respond with JSON only:
{rootCause, affectedFile, affectedLine, suggestedFix, patchDiff, confidence, explanation, fixStrategy}`,
        prompt: `Stack Trace:\n${stackTrace}\n\nSource Files:\n${fileContext}${previousContext}`,
        temperature: 0.2,
      })

      return parseAnalysisText(text.text)
    }

    try {
      return await withTimeout(run())
    } catch (error) {
      throw new Error(
        `Failed to get DeepInfra analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}