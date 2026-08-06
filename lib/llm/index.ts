export interface AnalysisResult {
  rootCause: string
  affectedFile: string
  affectedLine: number
  suggestedFix: string
  patchDiff: string
  confidence: number
  explanation: string
  confidenceReasoning: string
  fixStrategy: 'one_liner' | 'refactor' | 'dependency_update' | 'config_change'
}

export interface ProviderDefinition {
  id: string
  name: string
  icon: string
  models: string[]
  requiresKey: boolean
  defaultBaseUrl?: string
  description: string
}

export interface LLMProvider {
  analyze(stackTrace: string, sourceFiles: Record<string, string>, previousAttempts?: string[]): Promise<AnalysisResult>
  embed(text: string): Promise<number[]>
  isAvailable(): Promise<boolean>
}

export const PROVIDERS: Record<string, ProviderDefinition> = {
  openai: { id: 'openai', name: 'OpenAI', icon: '◎', models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'], requiresKey: true, description: 'OpenAI frontier reasoning and coding models.' },
  anthropic: { id: 'anthropic', name: 'Anthropic', icon: 'A', models: ['claude-sonnet-4-5', 'claude-haiku-4-5'], requiresKey: true, description: 'Claude models optimized for analysis.' },
  google: { id: 'google', name: 'Google Gemini', icon: 'G', models: ['gemini-2.5-pro', 'gemini-2.5-flash'], requiresKey: true, description: 'Gemini models for long context investigations.' },
  deepinfra: { id: 'deepinfra', name: 'Deep Infra', icon: 'DI', models: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'Qwen/Qwen2.5-Coder-32B-Instruct'], requiresKey: true, description: 'Fast hosted open-source models.' },
  nvidia: { id: 'nvidia', name: 'NVIDIA NIM', icon: 'N', models: ['meta/llama-3.1-70b-instruct', 'mistralai/mixtral-8x7b-instruct-v0.1', 'qwen/qwen2.5-coder-32b-instruct'], requiresKey: true, defaultBaseUrl: 'https://integrate.api.nvidia.com/v1', description: 'NVIDIA hosted inference endpoints.' },
  ollama: { id: 'ollama', name: 'Ollama', icon: 'O', models: ['llama3.2', 'qwen2.5-coder', 'deepseek-coder-v2', 'mistral'], requiresKey: false, defaultBaseUrl: 'http://localhost:11434/v1', description: 'Private local models through Ollama.' },
  groq: { id: 'groq', name: 'Groq', icon: 'GQ', models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b'], requiresKey: true, description: 'Low-latency inference.' },
  openrouter: { id: 'openrouter', name: 'OpenRouter', icon: 'OR', models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'], requiresKey: true, description: 'A unified gateway to many providers.' },
}

export async function getLLMProvider(provider: string, apiKey: string, model: string, baseUrl?: string): Promise<LLMProvider> {
  switch (provider.toLowerCase()) {
    case 'openai': { const { OpenAIProvider } = await import('./providers/openai'); return new OpenAIProvider(apiKey, model) }
    case 'anthropic': { const { AnthropicProvider } = await import('./providers/anthropic'); return new AnthropicProvider(apiKey, model) }
    case 'gemini': case 'google': { const { GeminiProvider } = await import('./providers/gemini'); return new GeminiProvider(apiKey, model) }
    case 'nvidia': { const { NvidiaProvider } = await import('./providers/nvidia'); return new NvidiaProvider(apiKey, model) }
    case 'ollama': { const { OllamaProvider } = await import('./providers/ollama'); return new OllamaProvider(model, baseUrl ?? PROVIDERS.ollama.defaultBaseUrl) }
    case 'groq': { const { GroqProvider } = await import('./providers/groq'); return new GroqProvider(apiKey, model) }
    case 'openrouter': { const { OpenRouterProvider } = await import('./providers/openrouter'); return new OpenRouterProvider(apiKey, model) }
    default: throw new Error(`Unsupported LLM provider: ${provider}`)
  }
}
