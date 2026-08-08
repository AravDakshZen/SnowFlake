import { generateText } from 'ai'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { withTimeout } from './parse'

const OPENAI_COMPAT_BASE_URLS: Record<string, string> = {
  deepinfra: 'https://api.deepinfra.com/v1/openai',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  together: 'https://api.together.xyz/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1',
  ollama: 'http://localhost:11434/v1',
}

export interface CommitMessageContext {
  provider: string
  apiKey: string
  model: string
  baseUrl?: string
  context: string
}

export async function generateCommitMessage(params: CommitMessageContext): Promise<string> {
  const { provider, apiKey, model, baseUrl, context } = params
  const normalized = provider.toLowerCase()

  let modelInstance: unknown
  switch (normalized) {
    case 'openai':
      modelInstance = openai(model)
      break
    case 'anthropic':
      modelInstance = anthropic(model)
      break
    case 'gemini':
    case 'google':
      modelInstance = google(model)
      break
    default: {
      const client = createOpenAI({
        apiKey,
        baseURL: baseUrl ?? OPENAI_COMPAT_BASE_URLS[normalized],
      })
      modelInstance = client.chat(model)
    }
  }

  const { text } = await withTimeout(
    generateText({
      model: modelInstance as Parameters<typeof generateText>[0]['model'],
      system:
        'You are an expert software engineer writing git commits. Given a bug-fix summary, write ONE concise conventional commit message (type: subject). Do not add a body, issues, or markdown formatting.',
      prompt: context,
      temperature: 0.3,
    })
  )

  return text.trim()
}
