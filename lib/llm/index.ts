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
  isFree?: boolean
  modelDetails?: Record<string, { context?: string; free?: boolean }>
}

export interface LLMProvider {
  analyze(stackTrace: string, sourceFiles: Record<string, string>, previousAttempts?: string[]): Promise<AnalysisResult>
  embed(text: string): Promise<number[]>
  isAvailable(): Promise<boolean>
}

export const PROVIDERS: Record<string, ProviderDefinition> = {
  openai: {
    id: 'openai', name: 'OpenAI', icon: '◎',
    models: [
      'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano',
      'gpt-5.2', 'gpt-5.2-pro',
      'gpt-5', 'gpt-5-pro', 'gpt-5-mini', 'gpt-5-nano',
      'gpt-4o', 'gpt-4o-mini',
      'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
      'o3', 'o3-mini', 'o4-mini',
      'gpt-4o-realtime-preview', 'gpt-4o-mini-realtime-preview',
      'gpt-4o-audio-preview', 'gpt-4o-mini-audio-preview',
      'gpt-4o-search-preview', 'gpt-4o-mini-search-preview',
      'gpt-oss-120b', 'gpt-oss-20b',
    ],
    requiresKey: true,
    description: 'OpenAI frontier reasoning and coding models.',
    modelDetails: {
      'gpt-5.4': { context: '256K' },
      'gpt-5.4-mini': { context: '256K' },
      'gpt-5.4-nano': { context: '128K' },
      'gpt-5.2': { context: '256K' },
      'gpt-5.2-pro': { context: '256K' },
      'gpt-5': { context: '256K' },
      'gpt-5-pro': { context: '256K' },
      'gpt-5-mini': { context: '128K' },
      'gpt-5-nano': { context: '128K' },
      'gpt-4o': { context: '128K' },
      'gpt-4o-mini': { context: '128K' },
      'gpt-4.1': { context: '1M' },
      'gpt-4.1-mini': { context: '1M' },
      'gpt-4.1-nano': { context: '1M' },
      'o3': { context: '200K' },
      'o3-mini': { context: '200K' },
      'o4-mini': { context: '200K' },
      'gpt-oss-120b': { context: '128K' },
      'gpt-oss-20b': { context: '128K' },
    },
  },
  anthropic: {
    id: 'anthropic', name: 'Anthropic', icon: 'A',
    models: [
      'claude-opus-5', 'claude-opus-4-5', 'claude-opus-4-1', 'claude-opus-4',
      'claude-sonnet-5', 'claude-sonnet-4-5', 'claude-sonnet-4',
      'claude-haiku-4-5', 'claude-haiku-4', 'claude-3-haiku',
    ],
    requiresKey: true,
    description: 'Claude models optimized for analysis.',
    modelDetails: {
      'claude-opus-5': { context: '200K' },
      'claude-opus-4-5': { context: '200K' },
      'claude-opus-4-1': { context: '200K' },
      'claude-opus-4': { context: '200K' },
      'claude-sonnet-5': { context: '200K' },
      'claude-sonnet-4-5': { context: '200K' },
      'claude-sonnet-4': { context: '200K' },
      'claude-haiku-4-5': { context: '200K' },
      'claude-haiku-4': { context: '200K' },
      'claude-3-haiku': { context: '200K' },
    },
  },
  google: {
    id: 'google', name: 'Google Gemini', icon: 'G',
    models: [
      'gemini-3.5-flash', 'gemini-3.5-pro',
      'gemini-3.1-pro-preview', 'gemini-3-flash-preview',
      'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite',
      'gemini-2.0-flash', 'gemini-2.0-flash-lite',
      'gemini-1.5-pro', 'gemini-1.5-flash',
    ],
    requiresKey: true,
    description: 'Gemini models for long context investigations.',
    modelDetails: {
      'gemini-3.5-flash': { context: '1M' },
      'gemini-3.5-pro': { context: '2M' },
      'gemini-3.1-pro-preview': { context: '1M' },
      'gemini-3-flash-preview': { context: '1M' },
      'gemini-2.5-pro': { context: '1M' },
      'gemini-2.5-flash': { context: '1M' },
      'gemini-2.5-flash-lite': { context: '1M' },
      'gemini-2.0-flash': { context: '1M' },
      'gemini-2.0-flash-lite': { context: '1M' },
      'gemini-1.5-pro': { context: '2M' },
      'gemini-1.5-flash': { context: '1M' },
    },
  },
  nvidia: {
    id: 'nvidia', name: 'NVIDIA NIM', icon: 'N',
    models: [
      'meta/llama-3.3-70b-instruct', 'meta/llama-3.1-70b-instruct', 'meta/llama-3.1-8b-instruct',
      'nvidia/llama-3.1-nemotron-ultra-253b-v1', 'nvidia/llama-3.1-nemotron-70b-instruct',
      'nvidia/llama-3.1-nemotron-51b-instruct', 'nvidia/llama-3.3-nemotron-super-49b-v1',
      'nvidia/llama-3.3-nemotron-super-49b-v1.5', 'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3-super-120b-a12b', 'nvidia/nemotron-3-nano-30b-a3b',
      'deepseek-ai/deepseek-v4-flash-0731', 'deepseek-ai/deepseek-r1', 'deepseek-ai/deepseek-r1-distill-llama-70b',
      'openai/gpt-oss-120b', 'openai/gpt-oss-20b',
      'moonshotai/kimi-k2.6', 'z-ai/glm-5.2',
      'minimaxai/minimax-m3', 'mistralai/mistral-large', 'mistralai/mistral-nemotron',
      'nv-mistralai/mistral-nemo-12b-instruct', 'google/gemma-4-31b-it',
      'microsoft/phi-4', 'qwen/qwen3-235b-a22b',
    ],
    requiresKey: true,
    isFree: true,
    description: 'NVIDIA hosted free inference — 1000 API credits/day for free tier users.',
    modelDetails: {
      'meta/llama-3.3-70b-instruct': { context: '128K', free: true },
      'meta/llama-3.1-70b-instruct': { context: '128K', free: true },
      'meta/llama-3.1-8b-instruct': { context: '128K', free: true },
      'nvidia/llama-3.1-nemotron-ultra-253b-v1': { context: '128K', free: true },
      'nvidia/llama-3.1-nemotron-70b-instruct': { context: '128K', free: true },
      'nvidia/llama-3.1-nemotron-51b-instruct': { context: '128K', free: true },
      'nvidia/llama-3.3-nemotron-super-49b-v1': { context: '128K', free: true },
      'nvidia/llama-3.3-nemotron-super-49b-v1.5': { context: '128K', free: true },
      'nvidia/nemotron-3-ultra-550b-a55b': { context: '128K', free: true },
      'nvidia/nemotron-3-super-120b-a12b': { context: '128K', free: true },
      'nvidia/nemotron-3-nano-30b-a3b': { context: '128K', free: true },
      'deepseek-ai/deepseek-v4-flash-0731': { context: '128K', free: true },
      'deepseek-ai/deepseek-r1': { context: '128K', free: true },
      'deepseek-ai/deepseek-r1-distill-llama-70b': { context: '128K', free: true },
      'openai/gpt-oss-120b': { context: '128K', free: true },
      'openai/gpt-oss-20b': { context: '128K', free: true },
      'moonshotai/kimi-k2.6': { context: '128K', free: true },
      'z-ai/glm-5.2': { context: '128K', free: true },
      'minimaxai/minimax-m3': { context: '128K', free: true },
      'mistralai/mistral-large': { context: '128K', free: true },
      'mistralai/mistral-nemotron': { context: '128K', free: true },
      'nv-mistralai/mistral-nemo-12b-instruct': { context: '128K', free: true },
      'google/gemma-4-31b-it': { context: '128K', free: true },
      'microsoft/phi-4': { context: '16K', free: true },
      'qwen/qwen3-235b-a22b': { context: '128K', free: true },
    },
  },
  ollama: {
    id: 'ollama', name: 'Ollama', icon: 'O',
    models: [
      'llama3.3', 'llama3.2', 'llama3.1', 'llama3',
      'qwen3', 'qwen3-coder', 'qwen2.5-coder',
      'deepseek-coder-v2', 'deepseek-r1', 'deepseek-v2', 'deepseek-v3', 'deepseek-v4-flash',
      'phi4', 'phi3', 'mistral', 'mixtral', 'codellama',
      'gemma3', 'gemma2', 'command-r-plus', 'command-r',
    ],
    requiresKey: false,
    defaultBaseUrl: 'http://localhost:11434/v1',
    description: 'Private local models through Ollama.',
    modelDetails: {
      'llama3.3': { context: '128K' },
      'llama3.2': { context: '128K' },
      'llama3.1': { context: '128K' },
      'llama3': { context: '8K' },
      'qwen3': { context: '128K' },
      'qwen3-coder': { context: '128K' },
      'qwen2.5-coder': { context: '128K' },
      'deepseek-coder-v2': { context: '128K' },
      'deepseek-r1': { context: '128K' },
      'deepseek-v2': { context: '128K' },
      'deepseek-v3': { context: '128K' },
      'deepseek-v4-flash': { context: '128K' },
      'phi4': { context: '16K' },
      'phi3': { context: '128K' },
      'mistral': { context: '32K' },
      'mixtral': { context: '32K' },
      'codellama': { context: '16K' },
      'gemma3': { context: '128K' },
      'gemma2': { context: '8K' },
      'command-r-plus': { context: '128K' },
      'command-r': { context: '128K' },
    },
  },
  together: {
    id: 'together', name: 'Together AI', icon: 'T',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'meta-llama/Llama-3.3-70B-Instruct',
      'meta-llama/Llama-3.1-8B-Instruct', 'meta-llama/Llama-3.1-70B-Instruct',
      'meta-llama/Llama-4-Maverick-17B-128E-Instruct', 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
      'Qwen/Qwen3-235B-A22B-Instruct-2507', 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
      'Qwen/Qwen3-Coder-Next', 'Qwen/Qwen3-Next-80B-A3B-Instruct',
      'Qwen/Qwen2.5-Coder-32B-Instruct', 'Qwen/Qwen2.5-7B-Instruct',
      'deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1',
      'google/gemma-4-26B-A4B-it', 'google/gemma-4-31B-it',
      'MiniMaxAI/MiniMax-M2.7', 'MiniMaxAI/MiniMax-M3',
      'openai/gpt-oss-120b', 'openai/gpt-oss-20b',
      'mistralai/Mistral-7B-Instruct-v0.3', 'NousResearch/Hermes-3-Llama-3.1-405B',
    ],
    requiresKey: true,
    description: 'Fast unified inference across open models.',
    modelDetails: {
      'meta-llama/Llama-3.3-70B-Instruct-Turbo': { context: '128K' },
      'meta-llama/Llama-3.3-70B-Instruct': { context: '128K' },
      'meta-llama/Llama-3.1-8B-Instruct': { context: '128K' },
      'meta-llama/Llama-3.1-70B-Instruct': { context: '128K' },
      'meta-llama/Llama-4-Maverick-17B-128E-Instruct': { context: '128K' },
      'meta-llama/Llama-4-Scout-17B-16E-Instruct': { context: '128K' },
      'Qwen/Qwen3-235B-A22B-Instruct-2507': { context: '128K' },
      'Qwen/Qwen3-Coder-480B-A35B-Instruct': { context: '128K' },
      'Qwen/Qwen3-Coder-Next': { context: '128K' },
      'Qwen/Qwen3-Next-80B-A3B-Instruct': { context: '128K' },
      'Qwen/Qwen2.5-Coder-32B-Instruct': { context: '128K' },
      'Qwen/Qwen2.5-7B-Instruct': { context: '128K' },
      'deepseek-ai/DeepSeek-V3': { context: '128K' },
      'deepseek-ai/DeepSeek-R1': { context: '128K' },
      'google/gemma-4-26B-A4B-it': { context: '128K' },
      'google/gemma-4-31B-it': { context: '128K' },
      'MiniMaxAI/MiniMax-M2.7': { context: '128K' },
      'MiniMaxAI/MiniMax-M3': { context: '128K' },
      'openai/gpt-oss-120b': { context: '128K' },
      'openai/gpt-oss-20b': { context: '128K' },
      'mistralai/Mistral-7B-Instruct-v0.3': { context: '32K' },
      'NousResearch/Hermes-3-Llama-3.1-405B': { context: '128K' },
    },
  },
  openrouter: {
    id: 'openrouter', name: 'OpenRouter', icon: 'OR',
    models: [
      'openai/gpt-5.4', 'openai/gpt-5.4-mini', 'openai/gpt-5.2', 'openai/gpt-5.2-pro',
      'openai/gpt-5', 'openai/gpt-5-pro', 'openai/gpt-5-mini', 'openai/gpt-5-nano',
      'openai/gpt-4o', 'openai/gpt-4.1', 'openai/gpt-4.1-mini', 'openai/gpt-4.1-nano',
      'openai/o3', 'openai/o3-mini', 'openai/o4-mini',
      'anthropic/claude-opus-5', 'anthropic/claude-opus-4.5', 'anthropic/claude-opus-4.1',
      'anthropic/claude-sonnet-5', 'anthropic/claude-sonnet-4.5', 'anthropic/claude-haiku-4.5',
      'anthropic/claude-3.5-haiku', 'anthropic/claude-3.5-sonnet',
      'google/gemini-3.5-flash', 'google/gemini-3.1-pro-preview',
      'google/gemini-2.5-pro', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite',
      'deepseek/deepseek-chat', 'deepseek/deepseek-chat-v3.1', 'deepseek/deepseek-r1',
      'deepseek/deepseek-v4-flash',
      'meta-llama/llama-3.3-70b-instruct', 'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout',
      'qwen/qwen3.7-max', 'qwen/qwen3.6-max-preview', 'qwen/qwen3-coder',
      'qwen/qwen-2.5-coder-32b-instruct', 'qwen/qwen-2.5-72b-instruct',
      'mistralai/mistral-large', 'mistralai/mistral-small-3.2-24b-instruct',
      'moonshotai/kimi-k3', 'moonshotai/kimi-k2.7-code',
      'z-ai/glm-5.2', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b',
      'nousresearch/hermes-3-llama-3.1-405b', 'nousresearch/hermes-3-llama-3.1-70b',
    ],
    requiresKey: true,
    description: 'Unified gateway to 100+ models, many free or near-free.',
    modelDetails: {
      'openai/gpt-5.4': { context: '256K' },
      'openai/gpt-5.4-mini': { context: '256K' },
      'openai/gpt-5.2': { context: '256K' },
      'openai/gpt-5.2-pro': { context: '256K' },
      'openai/gpt-5': { context: '256K' },
      'openai/gpt-5-pro': { context: '256K' },
      'openai/gpt-5-mini': { context: '128K' },
      'openai/gpt-5-nano': { context: '128K' },
      'openai/gpt-4o': { context: '128K' },
      'openai/gpt-4.1': { context: '1M' },
      'openai/gpt-4.1-mini': { context: '1M' },
      'openai/gpt-4.1-nano': { context: '1M' },
      'openai/o3': { context: '200K' },
      'openai/o3-mini': { context: '200K' },
      'openai/o4-mini': { context: '200K' },
      'anthropic/claude-opus-5': { context: '200K' },
      'anthropic/claude-opus-4.5': { context: '200K' },
      'anthropic/claude-opus-4.1': { context: '200K' },
      'anthropic/claude-sonnet-5': { context: '200K' },
      'anthropic/claude-sonnet-4.5': { context: '200K' },
      'anthropic/claude-haiku-4.5': { context: '200K' },
      'anthropic/claude-3.5-haiku': { context: '200K' },
      'anthropic/claude-3.5-sonnet': { context: '200K' },
      'google/gemini-3.5-flash': { context: '1M' },
      'google/gemini-3.1-pro-preview': { context: '1M' },
      'google/gemini-2.5-pro': { context: '1M' },
      'google/gemini-2.5-flash': { context: '1M' },
      'google/gemini-2.5-flash-lite': { context: '1M' },
      'deepseek/deepseek-chat': { context: '128K' },
      'deepseek/deepseek-chat-v3.1': { context: '128K' },
      'deepseek/deepseek-r1': { context: '128K' },
      'deepseek/deepseek-v4-flash': { context: '128K' },
      'meta-llama/llama-3.3-70b-instruct': { context: '128K' },
      'meta-llama/llama-4-maverick': { context: '128K' },
      'meta-llama/llama-4-scout': { context: '128K' },
      'qwen/qwen3.7-max': { context: '128K' },
      'qwen/qwen3.6-max-preview': { context: '128K' },
      'qwen/qwen3-coder': { context: '128K' },
      'qwen/qwen-2.5-coder-32b-instruct': { context: '128K' },
      'qwen/qwen-2.5-72b-instruct': { context: '128K' },
      'mistralai/mistral-large': { context: '128K' },
      'mistralai/mistral-small-3.2-24b-instruct': { context: '128K' },
      'moonshotai/kimi-k3': { context: '128K' },
      'moonshotai/kimi-k2.7-code': { context: '128K' },
      'z-ai/glm-5.2': { context: '128K' },
      'openai/gpt-oss-120b': { context: '128K' },
      'openai/gpt-oss-20b': { context: '128K' },
      'nousresearch/hermes-3-llama-3.1-405b': { context: '128K' },
      'nousresearch/hermes-3-llama-3.1-70b': { context: '128K' },
    },
  },
  cerebras: {
    id: 'cerebras', name: 'Cerebras', icon: 'CB',
    models: [
      'llama-3.3-70b', 'llama-3.1-8b', 'llama-3.1-70b',
      'llama-3.1-8b-instruct', 'llama-3.3-70b-instruct',
      'qwen-2.5-32b', 'qwen-2.5-72b',
      'deepseek-r1', 'deepseek-v3',
      'gemma-2-9b', 'gemma-4-31b',
    ],
    requiresKey: true,
    isFree: true,
    description: 'Ultra-fast inference with free tier — wafer-scale compute.',
    modelDetails: {
      'llama-3.3-70b': { context: '128K', free: true },
      'llama-3.1-8b': { context: '128K', free: true },
      'llama-3.1-70b': { context: '128K', free: true },
      'llama-3.1-8b-instruct': { context: '128K', free: true },
      'llama-3.3-70b-instruct': { context: '128K', free: true },
      'qwen-2.5-32b': { context: '128K', free: true },
      'qwen-2.5-72b': { context: '128K', free: true },
      'deepseek-r1': { context: '128K', free: true },
      'deepseek-v3': { context: '128K', free: true },
      'gemma-2-9b': { context: '8K', free: true },
      'gemma-4-31b': { context: '128K', free: true },
    },
  },
  openai_compatible: {
    id: 'openai_compatible', name: 'Custom / OpenAI-Compatible', icon: '⚡',
    models: [],
    requiresKey: true,
    defaultBaseUrl: '',
    description: 'Any OpenAI-compatible endpoint (vLLM, LiteLLM, etc.).'
  },
}

// All providers that use an OpenAI-compatible chat completions endpoint.
// These share the same request/response shape — only the base URL differs.
export const OPENAI_COMPAT_PROVIDERS = new Set([
  'openrouter', 'together', 'nvidia', 'ollama',
  'cerebras', 'openai_compatible',
])

export const OPENAI_COMPAT_BASE_URLS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  together: 'https://api.together.xyz/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1',
  ollama: 'http://localhost:11434/v1',
  cerebras: 'https://api.cerebras.ai/v1',
}

export async function getLLMProvider(provider: string, apiKey: string, model: string, baseUrl?: string): Promise<LLMProvider> {
  switch (provider.toLowerCase()) {
    case 'openai': { const { OpenAIProvider } = await import('./providers/openai'); return new OpenAIProvider(apiKey, model) }
    case 'anthropic': { const { AnthropicProvider } = await import('./providers/anthropic'); return new AnthropicProvider(apiKey, model) }
    case 'gemini': case 'google': { const { GeminiProvider } = await import('./providers/gemini'); return new GeminiProvider(apiKey, model) }
    case 'nvidia': { const { NvidiaProvider } = await import('./providers/nvidia'); return new NvidiaProvider(apiKey, model) }
    case 'ollama': { const { OllamaProvider } = await import('./providers/ollama'); return new OllamaProvider(model, baseUrl ?? PROVIDERS.ollama.defaultBaseUrl) }
    case 'openrouter': { const { OpenRouterProvider } = await import('./providers/openrouter'); return new OpenRouterProvider(apiKey, model) }
    case 'together': { const { TogetherProvider } = await import('./providers/together'); return new TogetherProvider(apiKey, model) }
    case 'cerebras': { const { OpenAICompatibleProvider } = await import('./providers/openai-compatible'); return new OpenAICompatibleProvider(apiKey, model, baseUrl ?? OPENAI_COMPAT_BASE_URLS.cerebras, 'Cerebras') }
    case 'openai_compatible': {
      if (!baseUrl) throw new Error('Custom OpenAI-compatible provider requires a Base URL.')
      const { OpenAICompatibleProvider } = await import('./providers/openai-compatible')
      return new OpenAICompatibleProvider(apiKey, model, baseUrl, 'Custom')
    }
    default: throw new Error(`Unsupported LLM provider: ${provider}`)
  }
}
