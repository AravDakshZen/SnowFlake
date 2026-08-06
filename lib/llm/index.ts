export interface AnalysisResult {
  rootCause: string;
  affectedFile: string;
  affectedLine: number;
  suggestedFix: string;
  patchDiff: string;
  confidence: number;
  explanation: string;
  fixStrategy: 'one-liner' | 'refactor' | 'dependency-update' | 'config-change';
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
      const { OpenRouterProvider } = await import('./providers/openrouter');
      return new OpenRouterProvider(apiKey, model);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}
