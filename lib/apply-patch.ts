// Applies an LLM-generated unified diff (patchDiff) to file content.
// The LLM patch format is a subset of unified diff:
//   @@ -a,b +c,d @@  header lines, followed by ' ' context, '-' removed, '+' added.

export interface PatchHunk {
  oldStart: number
  oldLines: string[] // context + removed lines (what to find)
  newLines: string[] // context + added lines (what to produce)
}

function parseHunks(patch: string): PatchHunk[] {
  const hunks: PatchHunk[] = []
  const lines = patch.split('\n')
  let current: PatchHunk | null = null

  for (const raw of lines) {
    const header = raw.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    if (header) {
      if (current) hunks.push(current)
      current = { oldStart: parseInt(header[1], 10), oldLines: [], newLines: [] }
      continue
    }
    if (!current) continue // skip diff headers (--- / +++ / index)

    if (raw.startsWith('+')) {
      current.newLines.push(raw.slice(1))
    } else if (raw.startsWith('-')) {
      current.oldLines.push(raw.slice(1))
    } else {
      const content = raw.replace(/^ /, '')
      current.oldLines.push(content)
      current.newLines.push(content)
    }
  }
  if (current) hunks.push(current)
  return hunks
}

// Locates `block` inside `file` near `hintIndex` (0-based). Returns match index
// or -1. The hint comes from the hunk's relative position, but we allow the
// block to be found anywhere when the hint misses (LLM patches may have drifted).
function findBlock(file: string[], block: string[], hintIndex: number): number {
  if (block.length === 0) return hintIndex >= 0 && hintIndex <= file.length ? hintIndex : file.length
  const window = 3
  const start = Math.max(0, hintIndex - window)
  const end = Math.min(file.length - block.length, hintIndex + window)
  for (let i = start; i <= end; i++) {
    let match = true
    for (let j = 0; j < block.length; j++) {
      if (file[i + j] !== block[j]) {
        match = false
        break
      }
    }
    if (match) return i
  }
  return -1
}

/**
 * Applies a unified diff to `original` content. Returns the patched file content,
 * or null when the patch is not a parseable diff / no hunks are present / a hunk
 * cannot be located in the original file.
 */
export function applyUnifiedPatch(original: string, patch: string): string | null {
  if (!patch || !patch.includes('@@')) return null
  const hunks = parseHunks(patch)
  if (hunks.length === 0) return null

  const file = original ? original.split('\n') : []
  const withTrailingNewline = original.endsWith('\n')

  // Apply from the bottom up so earlier line numbers stay valid.
  for (let i = hunks.length - 1; i >= 0; i--) {
    const hunk = hunks[i]
    const hint = hunk.oldStart - 1
    const at = findBlock(file, hunk.oldLines, hint)
    if (at === -1) return null
    file.splice(at, hunk.oldLines.length, ...hunk.newLines)
  }

  const result = file.join('\n')
  return result + (withTrailingNewline ? '\n' : '')
}

// Heuristic to tell "this is actual code" apart from an LLM prose explanation,
// so the worker only dumps a fix into the file when it looks like source.
const CODE_LINE_RE =
  /(?:=|=>|\{|\}|\(|\)|;|return\s|import\s|export\s|function\s|const\s|let\s|var\s|class\s|if\s*\(|for\s*\(|while\s*\(|def\s|public\s|private\s|<\/|<\/?[a-z])/i

export function looksLikeCode(text: string): boolean {
  if (!text) return false
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return false
  const codeLines = lines.filter((l) => CODE_LINE_RE.test(l))
  return codeLines.length >= Math.min(2, lines.length)
}

// Extract meaningful '+' change lines, skipping '+++ b/file' diff headers.
export function extractPatchChanges(patch: string, maxItems = 5): string[] {
  if (!patch) return []
  const changes: string[] = []
  for (const raw of patch.split('\n')) {
    if (!raw.startsWith('+') || raw.startsWith('+++')) continue
    const line = raw.slice(1).trim()
    if (!line) continue
    changes.push(line)
    if (changes.length >= maxItems) break
  }
  return changes
}