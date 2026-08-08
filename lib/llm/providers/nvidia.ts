import type { LLMProvider, AnalysisResult } from '../index'
import { parseAnalysisText, withTimeout, LLM_TIMEOUT_MS } from '../parse'

export class NvidiaProvider implements LLMProvider {
  constructor(private apiKey: string, private model: string) {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
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
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
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
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })

      if (!response.ok) {
        throw new Error(`NVIDIA returned ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      return parseAnalysisText(content)
    }

    try {
      return await withTimeout(run())
    } catch (error) {
      throw new Error(
        `Failed to get NVIDIA analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}