import { generateText, embed } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { LLMProvider, AnalysisResult } from '../index'
import { parseAnalysisText, withTimeout, LLM_TIMEOUT_MS } from '../parse'
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt, classifyError } from '../prompt'

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
          `Together API key is invalid or expired. ` +
          `Update your key in Settings > LLM Providers.`
        )
      }

      if (classified.type === 'rate_limit') {
        throw new Error(
          `Together rate limit exceeded for ${this.model}. ` +
          `Wait and retry, or switch to another provider.`
        )
      }

      throw new Error(
        `Failed to get Together analysis: ${classified.message}`
      )
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
