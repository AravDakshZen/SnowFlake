import type { LLMProvider, AnalysisResult } from '../index'
import { parseAnalysisText, withTimeout, LLM_TIMEOUT_MS } from '../parse'
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '../prompt'

export class OllamaProvider implements LLMProvider {
  constructor(
    private model: string,
    private baseUrl: string = 'https://ollama.com',
    private apiKey?: string
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
        signal: AbortSignal.timeout(10000),
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
    const userPrompt = buildAnalysisPrompt({ stackTrace, sourceFiles: sourceCode })

    const run = async () => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          options: { temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(`Ollama returned ${response.status}: ${body.slice(0, 200)}`)
      }

      const data = await response.json()
      return parseAnalysisText(data.message?.content || '')
    }

    try {
      return await withTimeout(run())
    } catch (error) {
      throw new Error(
        `Failed to get Ollama analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}