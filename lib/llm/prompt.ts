/**
 * Optimized analysis prompts and error classification for all LLM providers.
 *
 * The prompt is designed to:
 * - Maximize bug detection recall across all provided files
 * - Produce structured, parseable JSON output
 * - Calibrate confidence scores realistically
 * - Handle edge cases (empty files, missing context, prior failed attempts)
 */

// ── Error Classification ──────────────────────────────────────────────

export interface ClassifiedError {
  type: 'auth' | 'rate_limit' | 'context_limit' | 'model_not_found' | 'network' | 'unknown'
  message: string
  retryable: boolean
}

const AUTH_PATTERNS = [
  /401/,
  /403/,
  /unauthorized/i,
  /invalid.*credential/i,
  /invalid.*token/i,
  /invalid.*api.?key/i,
  /authentication/i,
  /access.?denied/i,
  /permission.?denied/i,
  /oauth/i,
  /UNAUTHENTICATED/i,
  /ACCESS_TOKEN/i,
]

const RATE_LIMIT_PATTERNS = [
  /429/,
  /rate.?limit/i,
  /too.?many.?requests/i,
  /quota.?exceeded/i,
  /credits.?exhausted/i,
  /throttl/i,
]

const CONTEXT_LIMIT_PATTERNS = [
  /context.*limit/i,
  /context.*length/i,
  /context.*exceed/i,
  /maximum.*context/i,
  /token.*limit/i,
  /input.*too.*long/i,
  /prompt.*too.*long/i,
  /max.*token/i,
]

const MODEL_NOT_FOUND_PATTERNS = [
  /model.*not.*found/i,
  /model.*does.*not.*exist/i,
  /unknown.*model/i,
  /invalid.*model/i,
  /not.*supported/i,
]

export function classifyError(error: unknown): ClassifiedError {
  const msg = error instanceof Error ? error.message : String(error)

  for (const p of AUTH_PATTERNS) {
    if (p.test(msg)) return { type: 'auth', message: msg, retryable: false }
  }
  for (const p of RATE_LIMIT_PATTERNS) {
    if (p.test(msg)) return { type: 'rate_limit', message: msg, retryable: true }
  }
  for (const p of CONTEXT_LIMIT_PATTERNS) {
    if (p.test(msg)) return { type: 'context_limit', message: msg, retryable: true }
  }
  for (const p of MODEL_NOT_FOUND_PATTERNS) {
    if (p.test(msg)) return { type: 'model_not_found', message: msg, retryable: false }
  }
  return { type: 'unknown', message: msg, retryable: false }
}

// ── Optimized System Prompt ───────────────────────────────────────────

/**
 * The core system prompt used by all providers. Optimized for:
 * - Higher bug detection recall (explicit enumeration of bug types)
 * - Realistic confidence calibration (not overconfident)
 * - Complete patchDiff output (not truncated)
 * - Handling edge cases (empty source, no stack trace)
 */
export const ANALYSIS_SYSTEM_PROMPT = `You are an expert software engineer performing automated root-cause analysis on production errors. Your job is to find EVERY bug in the provided source files and produce a patch that fixes all of them.

## Analysis Strategy

1. **Parse the stack trace first.** Extract: error type, message, file path, line number, function name, and call chain.
2. **Map stack frames to source files.** The stack trace points to WHERE the error manifested. The ROOT CAUSE is usually upstream.
3. **Scan ALL provided files for bugs** — not just the file in the stack trace. Common root causes:
   - Null/undefined dereference (accessing .property on null)
   - Type mismatches (string vs number, missing type guards)
   - Race conditions (async without await, concurrent writes)
   - Missing error handling (uncaught promises, empty catch blocks)
   - Off-by-one errors (array bounds, date calculations)
   - Logic errors (wrong operator, inverted condition, missing break)
   - Resource leaks (unclosed connections, missing cleanup)
   - Configuration errors (wrong env var, missing default)
4. **For each bug found**, include a separate hunk in patchDiff. Do NOT stop at the first bug.
5. **Calibrate confidence honestly:**
   - 90-100: Stack trace clearly points to the bug, source confirms it, fix is obvious
   - 70-89: Strong evidence but some assumptions made (e.g., inferred from context)
   - 50-69: Probable root cause but multiple possible explanations
   - 30-49: Best guess with limited context
   - 0-29: Speculative — insufficient information to diagnose

## Output Format

Respond with ONLY valid JSON (no markdown, no explanation outside JSON):

{
  "rootCause": "One sentence describing the primary bug. Be specific: mention the variable, condition, and why it fails.",
  "affectedFile": "path/to/file.ts (relative to repo root)",
  "affectedLine": 42,
  "suggestedFix": "Complete corrected version of the affected file(s)",
  "patchDiff": "--- a/path/to/file.ts\\n+++ b/path/to/file.ts\\n@@ -line,count +line,count @@\\n- old line\\n+ new line",
  "confidence": 85,
  "explanation": "Detailed explanation of the root cause, why it happens, and how the fix resolves it.",
  "confidenceReasoning": "Why I gave this confidence score: what evidence supports it and what's uncertain.",
  "fixStrategy": "one_liner | refactor | dependency_update | config_change"
}

## Critical Rules

- patchDiff MUST use unified diff format with @@ hunks. Include a hunk for EVERY bug.
- affectedLine MUST be the line where the bug originates (not where the error is thrown).
- If no bugs are found, set confidence to 0 and rootCause to "No bugs identified in provided source files."
- NEVER fabricate file paths or line numbers. Only reference files actually provided.
- If previous fix attempts are provided, analyze WHY they failed and avoid the same mistakes.`

// ── User Prompt Builder ───────────────────────────────────────────────

export interface AnalysisPromptParts {
  stackTrace: string
  sourceFiles: Record<string, string>
  previousAttempts?: string[]
}

/**
 * Build the user-facing prompt from structured parts.
 * Truncates source files to stay within context limits.
 */
export function buildAnalysisPrompt(parts: AnalysisPromptParts): string {
  const MAX_FILE_CHARS = 12000 // ~3k tokens per file
  const MAX_TOTAL_CHARS = 40000 // ~10k tokens total

  const fileEntries = Object.entries(parts.sourceFiles)
  let totalChars = 0
  const filesSection: string[] = []

  for (const [path, content] of fileEntries) {
    const truncated = content.length > MAX_FILE_CHARS
      ? content.slice(0, MAX_FILE_CHARS) + `\n// ... truncated (${content.length} chars total)`
      : content

    const entry = `// File: ${path}\n${truncated}`
    totalChars += entry.length

    if (totalChars > MAX_TOTAL_CHARS) {
      filesSection.push(`// ... ${fileEntries.length - filesSection.length} more files omitted (context limit)`)
      break
    }
    filesSection.push(entry)
  }

  const parts2: string[] = []

  if (parts.previousAttempts && parts.previousAttempts.length > 0) {
    parts2.push(
      `## Previous Fix Attempts (FAILED — learn from these)\n` +
      parts.previousAttempts.map((a, i) => `### Attempt ${i + 1}\n${a}`).join('\n\n')
    )
  }

  parts2.push(`## Stack Trace\n\`\`\`\n${parts.stackTrace}\n\`\`\``)
  parts2.push(`## Source Files\n\`\`\`\n${filesSection.join('\n\n')}\n\`\`\``)

  return parts2.join('\n\n')
}
