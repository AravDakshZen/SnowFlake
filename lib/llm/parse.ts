import type { AnalysisResult } from './index'

export const LLM_TIMEOUT_MS = 30000

export function parseAnalysisText(text: string): AnalysisResult {
  let cleaned = text.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) cleaned = fenceMatch[1].trim()

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1)
  }

  const parsed = JSON.parse(cleaned)

  return {
    rootCause: String(parsed.rootCause ?? 'Unknown error'),
    affectedFile: String(parsed.affectedFile ?? 'index.ts'),
    affectedLine: normalizeLine(parsed.affectedLine),
    suggestedFix: String(parsed.suggestedFix ?? ''),
    patchDiff: String(parsed.patchDiff ?? ''),
    confidence: normalizeConfidence(parsed.confidence),
    explanation: String(parsed.explanation ?? 'Analysis'),
    confidenceReasoning: parsed.confidenceReasoning
      ? String(parsed.confidenceReasoning)
      : undefined,
    fixStrategy: normalizeStrategy(parsed.fixStrategy),
  }
}

export function normalizeLine(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value))
  const coerced = Number(value)
  return Number.isFinite(coerced) ? Math.max(0, Math.floor(coerced)) : 0
}

export function normalizeConfidence(value: unknown): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.min(100, Math.max(0, num <= 1 ? Math.round(num * 100) : Math.round(num)))
}

export function normalizeStrategy(value: unknown): AnalysisResult['fixStrategy'] {
  const strategies: AnalysisResult['fixStrategy'][] = [
    'one_liner',
    'refactor',
    'dependency_update',
    'config_change',
    'one-liner',
    'dependency-update',
    'config-change',
  ]
  const normalized = String(value ?? '').toLowerCase().replace(/-/g, '_')
  const match = strategies.find((s) => s.toLowerCase().replace(/-/g, '_') === normalized)
  return match ?? 'refactor'
}

export async function withTimeout<T>(promise: Promise<T>, ms: number = LLM_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`LLM request timed out after ${ms}ms`)),
          ms
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function extractImpliedRootCause(error: unknown): string {
  return error instanceof Error ? error.message : 'Analysis failed'
}

export function fallbackResult(
  providerName: string,
  error: unknown
): AnalysisResult {
  return {
    rootCause: extractImpliedRootCause(error),
    affectedFile: 'unknown',
    affectedLine: 0,
    suggestedFix: '',
    patchDiff: '',
    confidence: 0,
    explanation: `${providerName} provider error`,
    confidenceReasoning: undefined,
    fixStrategy: 'refactor',
  }
}