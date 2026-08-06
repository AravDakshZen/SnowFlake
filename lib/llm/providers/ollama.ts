import type { LLMProvider, AnalysisResult } from '../index'

export class OllamaProvider implements LLMProvider {
  constructor(private model: string, private baseUrl: string = 'http://localhost:11434') {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
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
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: `Analyze error:\n${stackTrace}\n\nSource:\n${JSON.stringify(sourceCode)}\n\nJSON response: {rootCause, affectedFile, affectedLine, suggestedFix}`,
          stream: false,
          temperature: 0.3,
        }),
      })

      const data = await response.json()
      try {
        const parsed = JSON.parse(data.response)
        return {
          rootCause: parsed.rootCause || 'Unknown',
          affectedFile: parsed.affectedFile || 'index.ts',
          affectedLine: parsed.affectedLine || 0,
          suggestedFix: parsed.suggestedFix || '',
          patchDiff: '',
          confidence: 75,
          explanation: `Analyzed with Ollama ${this.model}`,
          confidenceReasoning: 'Local analysis',
          fixStrategy: 'refactor' as const,
        }
      } catch {
        return {
          rootCause: data.response || 'Analysis failed',
          affectedFile: 'unknown',
          affectedLine: 0,
          suggestedFix: '',
          patchDiff: '',
          confidence: 0,
          explanation: 'Ollama analysis',
          confidenceReasoning: 'Parse error',
          fixStrategy: 'refactor' as const,
        }
      }
    } catch {
      return {
        rootCause: 'Connection failed',
        affectedFile: 'unknown',
        affectedLine: 0,
        suggestedFix: '',
        patchDiff: '',
        confidence: 0,
        explanation: 'Cannot connect to Ollama',
        confidenceReasoning: 'No connection',
        fixStrategy: 'refactor' as const,
      }
    }
  }
}
