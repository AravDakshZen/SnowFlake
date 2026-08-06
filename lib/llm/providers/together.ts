import { generateText, embed } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { LLMProvider, AnalysisResult } from '../index'

export class TogetherProvider implements LLMProvider {
  private apiKey: string
  private model: string
  private client: any

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey
    this.model = model
    this.client = createOpenAI({
      apiKey,
      baseURL: 'https://api.together.xyz/v1',
    })
  }

  async analyze(
    stackTrace: string,
    sourceFiles: Record<string, string>,
    previousAttempts?: string[]
  ): Promise<AnalysisResult> {
    const fileContext = Object.entries(sourceFiles)
      .map(([path, content]) => `File: ${path}\n${content}`)
      .join('\n\n')

    let systemPrompt = `You are a senior backend engineer performing automated root cause analysis.
Given a stack trace and the relevant source files, identify:
1. The exact root cause (one sentence)
2. The affected file path and line number
3. A complete corrected version of the affected file
4. A unified diff patch
5. Your confidence score (0-100) and a plain-english explanation of WHY that score
6. The fix strategy type (one_liner|refactor|dependency_update|config_change)
Respond ONLY with valid JSON matching this schema:
{
  "rootCause": "string",
  "affectedFile": "string",
  "affectedLine": number,
  "suggestedFix": "string",
  "patchDiff": "string",
  "confidence": number,
  "explanation": "string",
  "confidenceReasoning": "string",
  "fixStrategy": "string"
}`

    if (previousAttempts && previousAttempts.length > 0) {
      systemPrompt += `\n\nPrevious fix attempts failed. Learn from these and provide a corrected fix.`
    }

    const text = await generateText({
      model: this.client.chat(this.model),
      system: systemPrompt,
      prompt: `Stack Trace:\n${stackTrace}\n\nSource Files:\n${fileContext}`,
      temperature: 0.2,
    })

    try {
      return JSON.parse(text.text)
    } catch {
      throw new Error(`Failed to parse LLM response: ${text.text}`)
    }
  }

  async embed(text: string): Promise<number[]> {
    const embedding = await embed({
      model: this.client.embedding('togethercomputer/m2-bert-80M-8k-retrieval'),
      value: text,
    })
    return embedding.embedding
  }

  async isAvailable(): Promise<boolean> {
    try {
      const text = await generateText({
        model: this.client.chat(this.model),
        prompt: 'Say "ok"',
        maxTokens: 10,
      })
      return text.text.toLowerCase().includes('ok')
    } catch {
      return false
    }
  }
}
