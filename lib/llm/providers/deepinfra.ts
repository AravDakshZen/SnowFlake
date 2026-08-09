import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { LLMProvider, AnalysisResult } from '../index'
import { parseAnalysisText, withTimeout, LLM_TIMEOUT_MS } from '../parse'
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt, classifyError } from '../prompt'

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
    const userPrompt = buildAnalysisPrompt({ stackTrace, sourceFiles, previousAttempts })

    const run = async () => {
      const text = await generateText({
        model: this.client.chat(this.model),
        system: ANALYSIS_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.2,
      })

      return parseAnalysisText(text.text)
    }

    try {
      return await withTimeout(run())
    } catch (error) {
      const classified = classifyError(error)

      if (classified.type === 'auth') {
        throw new Error(
          `DeepInfra API key is invalid or expired. ` +
          `Update your key in Settings > LLM Providers.`
        )
      }

      if (classified.type === 'rate_limit') {
        throw new Error(
          `DeepInfra rate limit exceeded for ${this.model}. ` +
          `Wait and retry, or switch to another provider.`
        )
      }

      throw new Error(
        `Failed to get DeepInfra analysis: ${classified.message}`
      )
    }
  }
}