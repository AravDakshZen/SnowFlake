import { generateText } from 'ai'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { withTimeout } from './parse'
import { OPENAI_COMPAT_BASE_URLS } from './index'

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
      system: [
        'You are an expert software engineer writing git commit messages.',
        'Rules:',
        '- Write ONE line only. No body, no issues, no markdown.',
        '- Use conventional commit format: type(scope): subject',
        '- Subject must be under 50 characters.',
        '- Use imperative mood ("fix", "add", "remove", not "fixed", "added").',
        '- Focus on WHAT changed and WHY, not implementation details.',
        '- No trailing period.',
        '',
        'Types: fix, feat, refactor, perf, docs, test, chore, ci, build',
        '',
        'Good examples:',
        '- fix(auth): resolve token refresh race condition',
        '- feat(investigation): add retry logic for transient failures',
        '- perf(dashboard): parallelize stats and clusters fetch',
        '- refactor(llm): extract OpenAI-compatible provider base class',
        '',
        'Bad examples (too long, too vague, wrong tone):',
        '- Fixed the bug where the token was not refreshing properly in the authentication module',
        '- Update code',
        '- WIP: things',
      ].join('\n'),
      prompt: context,
      temperature: 0.2,
      maxTokens: 60,
    })
  )

  // Hard-cap at 12 words so auto-commits never produce wall-of-text messages.
  // Also strip any markdown fences or quotes the model may have added.
  const cleaned = text
    .trim()
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```$/i, '')
    .split('\n')[0]
    .replace(/^["']|["']$/g, '')
    .trim()

  // Take the first line, cap at 12 words
  const words = cleaned.split(/\s+/).filter(Boolean)
  return words.slice(0, 12).join(' ')
}
