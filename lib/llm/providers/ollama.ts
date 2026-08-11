import type { LLMProvider, AnalysisResult } from '../index'
import { parseAnalysisText, withTimeout, LLM_TIMEOUT_MS } from '../parse'
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '../prompt'

export class OllamaProvider implements LLMProvider {
  private isCloud: boolean
  
  constructor(
    private model: string, 
    private baseUrl: string = 'http://localhost:11434',
    private apiKey?: string
  ) {
    this.isCloud = !!apiKey || baseUrl.includes('cloud') || baseUrl.includes('api.')
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (this.isCloud && this.apiKey) {
        // Cloud mode - test with OpenAI-compatible endpoint
        const response = await fetch(`${this.baseUrl}/v1/models`, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
          signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
        })
        return response.ok
      } else {
        // Local mode - test with Ollama native API
        const response = await fetch(`${this.baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
        })
        return response.ok
      }
    } catch {
      return false
    }
  }

  async embed(text: string): Promise<number[]> {
    if (this.isCloud && this.apiKey) {
      // Cloud mode - use OpenAI-compatible embedding
      const response = await fetch(`${this.baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })
      
      if (!response.ok) {
        throw new Error(`Ollama cloud embedding failed: ${response.status}`)
      }
      
      const data = await response.json()
      return data.data?.[0]?.embedding || []
    }
    
    // Local mode - use simple hash-based embedding
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
      if (this.isCloud && this.apiKey) {
        // Cloud mode - use OpenAI-compatible chat completions
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
        })

        if (!response.ok) {
          throw new Error(`Ollama cloud returned ${response.status}`)
        }

        const data = await response.json()
        return parseAnalysisText(data.choices?.[0]?.message?.content || '')
      } else {
        // Local mode - use Ollama native API
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