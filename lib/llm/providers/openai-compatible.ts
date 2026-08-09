import type { LLMProvider, AnalysisResult } from '../index'
import { parseAnalysisText, withTimeout, LLM_TIMEOUT_MS } from '../parse'

/**
 * Generic OpenAI-compatible provider for providers that use
 * /v1/chat/completions with Bearer auth (Cerebras, SambaNova, Novita,
 * Chutes, SiliconFlow, or any custom endpoint).
 */
export class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string,
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'ping' }],
          temperature: 0.2,
          max_tokens: 10,
        }),
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

  async analyze(stackTrace: string, sourceCode: Record<string, string>): Promise<AnalysisResult> {
    const run = async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: `Analyze this error:\n${stackTrace}\n\nSource:\n${JSON.stringify(sourceCode)}\n\nFind EVERY bug in the source and include every fix in patchDiff (multiple hunks allowed). Respond with JSON only: {rootCause, affectedFile, affectedLine, suggestedFix, patchDiff, confidence, explanation, fixStrategy}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })

      if (!response.ok) {
        throw new Error(`${this.baseUrl} returned ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      return parseAnalysisText(content)
    }

    try {
      return await withTimeout(run())
    } catch (error) {
      throw new Error(
        `Failed to get analysis from ${this.baseUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
