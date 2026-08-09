import type { LLMProvider, AnalysisResult } from '../index'
import { parseAnalysisText, withTimeout, LLM_TIMEOUT_MS } from '../parse'
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '../prompt'

// Model-specific context window sizes (tokens). Used to auto-cap max_tokens.
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'nvidia/nemotron-3-nano-30b-a3b': 4096,
  'nvidia/llama-3.1-8b-instruct': 8192,
  'nvidia/llama-3.1-nemotron-51b-instruct': 16384,
  'nvidia/llama-3.1-nemotron-70b-instruct': 16384,
  'nvidia/llama-3.3-nemotron-super-49b-v1': 16384,
  'nvidia/llama-3.3-nemotron-super-49b-v1.5': 16384,
  'meta/llama-3.1-8b-instruct': 8192,
  'meta/llama-3.1-70b-instruct': 16384,
  'meta/llama-3.3-70b-instruct': 16384,
  'nvidia/llama-3.1-nemotron-ultra-253b-v1': 32768,
  'nvidia/nemotron-3-super-120b-a12b': 32768,
  'nvidia/nemotron-3-ultra-550b-a55b': 32768,
  'deepseek-ai/deepseek-r1': 32768,
  'deepseek-ai/deepseek-v4-flash-0731': 32768,
  'mistralai/mistral-large': 32768,
  'mistralai/mistral-nemotron': 32768,
  'z-ai/glm-5.2': 32768,
  'minimaxai/minimax-m3': 32768,
  'microsoft/phi-4': 16384,
  'google/gemma-4-31b-it': 32768,
  'qwen/qwen3-235b-a22b': 32768,
}

// Free-tier daily limit messages from NVIDIA
const FREE_TIER_LIMIT_MESSAGES = [
  'rate limit',
  'quota exceeded',
  'credits exhausted',
  'too many requests',
  '429',
]

function getModelMaxTokens(model: string, requestedMaxTokens: number): number {
  const contextWindow = MODEL_CONTEXT_WINDOWS[model] ?? 8192
  // Reserve 40% of context for input, use rest for output. Cap at requested.
  const safeOutputTokens = Math.floor(contextWindow * 0.4)
  return Math.min(requestedMaxTokens, safeOutputTokens)
}

function isContextLimitError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase()
  return lower.includes('context') && (lower.includes('limit') || lower.includes('length') || lower.includes('exceed'))
}

function isFreeTierLimit(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase()
  return FREE_TIER_LIMIT_MESSAGES.some(m => lower.includes(m))
}

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
    const MAX_RETRIES = 2
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.runAnalysis(stackTrace, sourceCode, attempt)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const msg = lastError.message

        // If context limit hit, retry with smaller input (truncated stack trace)
        if (isContextLimitError(msg) && attempt < MAX_RETRIES) {
          stackTrace = stackTrace.slice(0, Math.floor(stackTrace.length / 2))
          continue
        }

        // If free tier limit, don't retry — fail fast with clear message
        if (isFreeTierLimit(msg)) {
          throw new Error(
            `NVIDIA free tier limit reached for ${this.model}. ` +
            `Upgrade your plan at build.nvidia.com or switch to another provider.`
          )
        }

        // For 4xx errors other than context limits, don't retry
        if (msg.includes('400') || msg.includes('401') || msg.includes('403')) {
          throw new Error(`NVIDIA API error for ${this.model}: ${msg}`)
        }

        // For 5xx / network errors, retry
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
      }
    }

    throw new Error(
      `Failed to get NVIDIA analysis after ${MAX_RETRIES + 1} attempts: ${lastError?.message ?? 'Unknown error'}`
    )
  }

  private async runAnalysis(stackTrace: string, sourceCode: Record<string, string>, attempt: number): Promise<AnalysisResult> {
    // Progressively reduce max_tokens on retries to avoid context overflow
    const baseMaxTokens = 4096
    const maxTokens = attempt === 0
      ? getModelMaxTokens(this.model, baseMaxTokens)
      : Math.floor(getModelMaxTokens(this.model, baseMaxTokens) * 0.5)

    const userPrompt = buildAnalysisPrompt({ stackTrace, sourceFiles: sourceCode })

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
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
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`NVIDIA returned ${response.status}: ${body.slice(0, 300)}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    return parseAnalysisText(content)
  }
}
