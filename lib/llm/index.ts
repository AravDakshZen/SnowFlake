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

export interface LLMProvider {
  analyze(
    stackTrace: string,
    sourceFiles: Record<string, string>,
    previousAttempts?: string[]
  ): Promise<AnalysisResult>;
  embed(text: string): Promise<number[]>;
  isAvailable(): Promise<boolean>;
}

export async function getLLMProvider(
  provider: string,
  apiKey: string,
  model: string,
  baseUrl?: string
): Promise<LLMProvider> {
  switch (provider.toLowerCase()) {
    case 'openai':
      const { OpenAIProvider } = await import('./providers/openai');
      return new OpenAIProvider(apiKey, model);
    case 'anthropic':
      const { AnthropicProvider } = await import('./providers/anthropic');
      return new AnthropicProvider(apiKey, model);
    case 'gemini':
      const { GeminiProvider } = await import('./providers/gemini');
      return new GeminiProvider(apiKey, model);
    case 'groq':
      const { GroqProvider } = await import('./providers/groq');
      return new GroqProvider(apiKey, model);
    case 'openrouter':
      const { OpenRouterProvider } = await import('./providers/openrouter')
      return new OpenRouterProvider(apiKey, model)
    case 'nvidia':
      const { NvidiaProvider } = await import('./providers/nvidia')
      return new NvidiaProvider(apiKey, model)
    case 'together':
      const { TogetherProvider } = await import('./providers/together')
      return new TogetherProvider(apiKey, model)
    case 'ollama':
      const { OllamaProvider } = await import('./providers/ollama')
      return new OllamaProvider(model, baseUrl)
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`)
  }
}

export const PROVIDERS = {
  openai: { name: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  anthropic: { name: 'Anthropic', models: ['claude-sonnet-4-6', 'claude-haiku-4-5'] },
  gemini: { name: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  groq: { name: 'Groq', models: ['llama3-70b-8192', 'mixtral-8x7b-32768'] },
  nvidia: { name: 'NVIDIA', models: ['meta/llama-3.1-70b-instruct', 'mistralai/mixtral-8x7b'] },
  openrouter: { name: 'OpenRouter', models: ['mistralai/mistral-7b-instruct:free', 'nousresearch/hermes-2-pro-llama-3-8b:free'] },
  together: { name: 'Together AI', models: ['codellama/CodeLlama-34b-Instruct-hf', 'deepseek-ai/deepseek-coder-33b-instruct'] },
  ollama: { name: 'Ollama (Local)', models: ['llama3', 'codellama', 'deepseek-coder', 'mistral'] },
}
