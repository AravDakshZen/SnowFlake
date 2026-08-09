import { getLLMProvider } from '@/lib/llm'
import { decryptValue } from '@/lib/encryption'
import { getSql } from '@/lib/db'

export interface CommitMessageInput {
  provider: string
  apiKey: string
  model: string
  baseUrl?: string
  context: string
}

const COMMIT_PREFIX_RULES = [
  { pattern: /\b(security|vulnerability|xss|sqli?|injection|auth|credential|token|csrf)\b/i, prefix: 'fix(security)' },
  { pattern: /\b(crash|null|undefined|type.?error|uncaught|exception|throw|panic)\b/i, prefix: 'fix(crash)' },
  { pattern: /\b(memory.?leak|leak|overflow|oom|resource.?exhaust)\b/i, prefix: 'fix(memory)' },
  { pattern: /\b(race.?condition|concurrent|deadlock|synchroniz)\b/i, prefix: 'fix(concurrency)' },
  { pattern: /\b(api|endpoint|route|request|response|http|status.?code)\b/i, prefix: 'fix(api)' },
  { pattern: /\b(database|sql|query|migration|schema|relation)\b/i, prefix: 'fix(db)' },
  { pattern: /\b(auth|login|session|permission|role|access.?control)\b/i, prefix: 'fix(auth)' },
  { pattern: /\b(performance|slow|timeout|latency|cache|optimiz)\b/i, prefix: 'perf' },
  { pattern: /\b(test|spec|assert|expect|mock|stub|fixture)\b/i, prefix: 'test' },
  { pattern: /\b(doc|readme|comment|jsdoc|typedoc|typo)\b/i, prefix: 'docs' },
  { pattern: /\b(deps?|package|npm|yarn|pnpm|upgrade|vulnerab)\b/i, prefix: 'chore(deps)' },
  { pattern: /\b(config|env|setting|option|preference)\b/i, prefix: 'chore(config)' },
  { pattern: /\b(refactor|reorganiz|restructur|simplif|clean)\b/i, prefix: 'refactor' },
  { pattern: /\b(fix|bug|error|issue|broken|fault)\b/i, prefix: 'fix' },
  { pattern: /\b(add|creat|implement|new|feature|support)\b/i, prefix: 'feat' },
  { pattern: /\b(improv|enhanc|updat|optimiz|better)\b/i, prefix: 'improve' },
]

function selectPrefix(context: string): string {
  for (const rule of COMMIT_PREFIX_RULES) {
    if (rule.pattern.test(context)) {
      return rule.prefix
    }
  }
  return 'fix'
}

function stripProviderPrefix(model: string): string {
  let name = model.replace(/^(openai|anthropic|google|meta|nvidia|deepseek|mistral|qwen)\//i, '')
  name = name.replace(/-(?:inst|instruct|chat|code|base|preview|turbo)$/i, '')
  name = name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  if (name.length > 20) name = name.substring(0, 20).trim()
  return name
}

export async function generateCommitMessage(input: CommitMessageInput): Promise<string> {
  const { provider, apiKey, model, baseUrl, context } = input

  const systemPrompt = `You are a commit message generator for a code fixing tool called Snowflake.

Generate a concise, conventional commit message based on the context provided.

Rules:
1. Start with the appropriate prefix (auto-selected based on the fix type)
2. Keep the subject line under 72 characters
3. Use imperative mood ("fix" not "fixed")
4. Be specific about what was fixed
5. Do NOT include the prefix in your response - it will be added automatically
6. Do NOT include quotes around the message
7. Do NOT include a body - subject line only

The commit prefix will be auto-selected from the context. Just provide the subject line after the prefix.`

  const prompt = `Context for the commit message:

${context}

Generate a commit subject line (without prefix).`

  const llmProvider = await getLLMProvider(provider, apiKey, model, baseUrl)
  
  const result = await llmProvider.analyze(context, {})
  const generatedMessage = (result as any).explanation || result.rootCause

  const prefix = selectPrefix(context + ' ' + generatedMessage)
  const subject = generatedMessage
    .replace(/^(fix|feat|refactor|perf|test|docs|chore|improve)[\(:].*?:\s*/i, '')
    .trim()
    .substring(0, 72)

  return `${prefix}: ${subject}`
}

export function generateFallbackCommitMessage(context: string): string {
  const prefix = selectPrefix(context)
  const lines = context.split('\n').filter(l => l.trim())
  
  const affectedItem = lines.find(l => l.startsWith('- '))
    ?.replace(/^-\s*/, '')
    ?.split('/')
    ?.pop()
    || 'code'

  const shortContext = context.substring(0, 60).replace(/\n/g, ' ').trim()

  return `${prefix}: fix issues in ${affectedItem}`
}
