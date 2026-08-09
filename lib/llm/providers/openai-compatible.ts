import type { LLMProvider, AnalysisResult } from '../index'
import { parseAnalysisText, withTimeout, LLM_TIMEOUT_MS } from '../parse'
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt, classifyError } from '../prompt'

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
    private providerName?: string,
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

  async analyze(stackTrace: string, sourceCode: Record<string, string>, previousAttempts?: string[]): Promise<AnalysisResult> {
    const userPrompt = buildAnalysisPrompt({ stackTrace, sourceFiles: sourceCode, previousAttempts })

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
            { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(`${response.status}: ${body.slice(0, 500)}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const body = await response.text().catch(() => '')
        throw new Error(`Non-JSON response (${contentType}): ${body.slice(0, 500)}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      return parseAnalysisText(content)
    }

    try {
      return await withTimeout(run())
    } catch (error) {
      const classified = classifyError(error)
      const provider = this.providerName ?? new URL(this.baseUrl).hostname

      if (classified.type === 'auth') {
        throw new Error(
          `${provider} API key is invalid or expired. ` +
          `Update your key in Settings > LLM Providers.`
        )
      }

      if (classified.type === 'rate_limit') {
        throw new Error(
          `${provider} rate limit exceeded for ${this.model}. ` +
          `Wait and retry, or switch to another provider.`
        )
      }

      if (classified.type === 'model_not_found') {
        throw new Error(
          `${provider} model "${this.model}" not found. ` +
          `It may have been renamed or deprecated. Check available models.`
        )
      }

      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('404') || msg.includes('not found')) {
        throw new Error(
          `${provider} model "${this.model}" not found (404). ` +
          `Check available models in Settings > LLM Providers.`
        )
      }

      throw new Error(
        `Failed to get analysis from ${provider}: ${classified.message}`
      )
    }
  }
}
