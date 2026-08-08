export interface AnalysisResult {
  rootCause: string
  affectedFile: string
  affectedLine: number
  suggestedFix: string
  patchDiff: string
  confidence: number
  explanation: string
  confidenceReasoning?: string
  fixStrategy: 'one_liner' | 'refactor' | 'dependency_update' | 'config_change' | 'one-liner' | 'dependency-update' | 'config-change'
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
  openai: { id: 'openai', name: 'OpenAI', icon: '◎', models: ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.2', 'gpt-5.2-pro', 'gpt-5', 'gpt-5-pro', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3', 'o3-mini', 'o4-mini', 'gpt-oss-120b', 'gpt-oss-20b'], requiresKey: true, description: 'OpenAI frontier reasoning and coding models.' },
  anthropic: { id: 'anthropic', name: 'Anthropic', icon: 'A', models: ['claude-opus-5', 'claude-opus-4-5', 'claude-opus-4-1', 'claude-opus-4', 'claude-sonnet-5', 'claude-sonnet-4-5', 'claude-sonnet-4', 'claude-haiku-4-5', 'claude-3-haiku'], requiresKey: true, description: 'Claude models optimized for analysis.' },
  google: { id: 'google', name: 'Google Gemini', icon: 'G', models: ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'], requiresKey: true, description: 'Gemini models for long context investigations.' },
  deepinfra: { id: 'deepinfra', name: 'Deep Infra', icon: 'DI', models: ['deepseek-ai/DeepSeek-V4-Flash', 'deepseek-ai/DeepSeek-V4-Flash-0731', 'deepseek-ai/DeepSeek-V4-Pro', 'deepseek-ai/DeepSeek-V3.2', 'zai-org/GLM-5.2', 'zai-org/GLM-5.1', 'zai-org/GLM-5', 'zai-org/GLM-4.7-Flash', 'moonshotai/Kimi-K2.7-Code', 'moonshotai/Kimi-K2.6', 'moonshotai/Kimi-K2.5', 'Qwen/Qwen3.6-35B-A3B', 'Qwen/Qwen3.5-397B-A17B', 'Qwen/Qwen3-Max', 'Qwen/Qwen3-Max-Thinking', 'nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B', 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B', 'google/gemma-4-31B-it', 'ByteDance/Seed-2.0-pro', 'ByteDance/Seed-2.0-code', 'meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-Coder-32B-Instruct'], requiresKey: true, description: 'Fast hosted open-source models.' },
  nvidia: { id: 'nvidia', name: 'NVIDIA NIM', icon: 'N', models: ['meta/llama-3.3-70b-instruct', 'meta/llama-3.1-70b-instruct', 'meta/llama-3.1-8b-instruct', 'nvidia/llama-3.1-nemotron-ultra-253b-v1', 'nvidia/llama-3.1-nemotron-70b-instruct', 'nvidia/llama-3.1-nemotron-51b-instruct', 'nvidia/llama-3.3-nemotron-super-49b-v1', 'nvidia/llama-3.3-nemotron-super-49b-v1.5', 'nvidia/nemotron-3-ultra-550b-a55b', 'nvidia/nemotron-3-super-120b-a12b', 'nvidia/nemotron-3-nano-30b-a3b', 'deepseek-ai/deepseek-v4-flash-0731', 'deepseek-ai/deepseek-r1', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'moonshotai/kimi-k2.6', 'z-ai/glm-5.2', 'minimaxai/minimax-m3', 'mistralai/mistral-large', 'mistralai/mistral-nemotron', 'nv-mistralai/mistral-nemo-12b-instruct', 'google/gemma-4-31b-it', 'microsoft/phi-4'], requiresKey: true, description: 'NVIDIA hosted inference endpoints — API key only, no base URL needed.' },
  ollama: { id: 'ollama', name: 'Ollama', icon: 'O', models: ['llama3.3', 'llama3.2', 'llama3.1', 'qwen3', 'qwen2.5-coder', 'deepseek-coder-v2', 'deepseek-r1', 'phi4', 'mistral', 'mixtral', 'codellama'], requiresKey: false, defaultBaseUrl: 'http://localhost:11434/v1', description: 'Private local models through Ollama.' },
  together: { id: 'together', name: 'Together AI', icon: 'T', models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'meta-llama/Llama-3.3-70B-Instruct', 'meta-llama/Llama-3.1-8B-Instruct', 'meta-llama/Llama-4-Maverick-17B-128E-Instruct', 'meta-llama/Llama-4-Scout-17B-16E-Instruct', 'Qwen/Qwen3-235B-A22B-Instruct-2507', 'Qwen/Qwen3-Coder-480B-A35B-Instruct', 'Qwen/Qwen3-Coder-Next', 'Qwen/Qwen3-Next-80B-A3B-Instruct', 'Qwen/Qwen2.5-Coder-32B-Instruct', 'Qwen/Qwen2.5-7B-Instruct', 'deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'google/gemma-4-26B-A4B-it', 'google/gemma-4-31B-it', 'MiniMaxAI/MiniMax-M2.7', 'MiniMaxAI/MiniMax-M3', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'], requiresKey: true, description: 'Fast unified inference across open models.' },
  groq: { id: 'groq', name: 'Groq', icon: 'GQ', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound', 'groq/compound-mini', 'minimaxai/minimax-m2.7', 'qwen/qwen3.6-27b'], requiresKey: true, description: 'Low-latency inference.' },
  openrouter: { id: 'openrouter', name: 'OpenRouter', icon: 'OR', models: ['openai/gpt-5.4', 'openai/gpt-5.4-mini', 'openai/gpt-5.2', 'openai/gpt-5.2-pro', 'openai/gpt-5', 'openai/gpt-5-pro', 'openai/gpt-5-mini', 'openai/gpt-5-nano', 'openai/gpt-4o', 'openai/gpt-4.1', 'openai/gpt-4.1-mini', 'openai/gpt-4.1-nano', 'openai/o3', 'openai/o3-mini', 'openai/o4-mini', 'anthropic/claude-opus-5', 'anthropic/claude-opus-4.5', 'anthropic/claude-opus-4.1', 'anthropic/claude-sonnet-5', 'anthropic/claude-sonnet-4.5', 'anthropic/claude-haiku-4.5', 'google/gemini-3.5-flash', 'google/gemini-3.1-pro-preview', 'google/gemini-2.5-pro', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'deepseek/deepseek-chat', 'deepseek/deepseek-chat-v3.1', 'deepseek/deepseek-r1', 'deepseek/deepseek-v4-flash', 'meta-llama/llama-3.3-70b-instruct', 'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout', 'qwen/qwen3.7-max', 'qwen/qwen3.6-max-preview', 'qwen/qwen3-coder', 'qwen/qwen-2.5-coder-32b-instruct', 'mistralai/mistral-large', 'mistralai/mistral-small-3.2-24b-instruct', 'moonshotai/kimi-k3', 'moonshotai/kimi-k2.7-code', 'z-ai/glm-5.2', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'], requiresKey: true, description: 'A unified gateway to many providers.' },
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
    case 'together': { const { TogetherProvider } = await import('./providers/together'); return new TogetherProvider(apiKey, model) }
    case 'deepinfra': { const { DeepInfraProvider } = await import('./providers/deepinfra'); return new DeepInfraProvider(apiKey, model) }
    default: throw new Error(`Unsupported LLM provider: ${provider}`)
  }
}
