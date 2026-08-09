import type { LLMProvider, AnalysisResult } from '../index'
import { parseAnalysisText, withTimeout, LLM_TIMEOUT_MS } from '../parse'
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '../prompt'

export class OllamaProvider implements LLMProvider {
  constructor(private model: string, private baseUrl: string = 'http://localhost:11434') {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
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
    const userPrompt = buildAnalysisPrompt({ stackTrace, sourceFiles: sourceCode })

    const run = async () => {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          system: ANALYSIS_SYSTEM_PROMPT,
          prompt: userPrompt,
          stream: false,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`)
      }

      const data = await response.json()
      return parseAnalysisText(data.response || '')
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