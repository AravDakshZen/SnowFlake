import { getSelectedCategories, type IssueCategory } from '@/types/event'

export interface DetectionPromptInput {
  categoryIds: string[]
  sourceFiles: Record<string, string>
  stackTrace?: string
  previousAttempts?: string[]
}

export function buildDetectionPrompt(input: DetectionPromptInput): string {
  const { categoryIds, sourceFiles, stackTrace, previousAttempts } = input

  const selected = getSelectedCategories(categoryIds)

  const categoryInstructions = selected
    .map(c => c.promptInstructions)
    .join('\n\n')

  const fileList = Object.keys(sourceFiles)
    .map(path => `- ${path}`)
    .join('\n')

  const fileContents = Object.entries(sourceFiles)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join('\n\n')

  let prompt = `You are an autonomous code cleaning agent for Snowflake.
You will receive one or more source files to analyze.

ANALYSIS SCOPE — fix issues in this exact priority order:
${categoryInstructions}

CRITICAL RULES:
- Work through each priority level completely before moving to the next
- Never skip a higher priority issue to fix a lower priority one
- Fix EVERY issue in the file that matches the selected categories
- Never change function signatures that are exported
- Never change external behavior of the code
- Never add new dependencies not already imported
- Return the complete cleaned file with ALL fixes applied
- Return ONLY valid JSON matching the AnalysisResult schema
- No markdown, no preamble, no explanation outside the JSON

FILES TO ANALYZE:
${fileList}

`

  if (stackTrace) {
    prompt += `STACK TRACE (if available):
${stackTrace}

`
  }

  if (previousAttempts && previousAttempts.length > 0) {
    prompt += `PREVIOUS FAILED ATTEMPTS:
${previousAttempts.join('\n\n')}

`
  }

  prompt += `SOURCE FILES:
${fileContents}

SCHEMA TO RETURN:
{
  "files": [
    {
      "filePath": string,
      "cleanedContent": string,
      "issues": [
        {
          "id": string,
          "category": string,
          "severity": "critical"|"high"|"medium"|"low"|"info",
          "priority": number,
          "line": number,
          "description": string,
          "before": string,
          "after": string,
          "reason": string
        }
      ],
      "summary": {
        "totalFound": number,
        "totalFixed": number,
        "byCategory": { [categoryId]: number }
      }
    }
  ],
  "overallConfidence": number,
  "confidenceReasoning": string,
  "estimatedFixTime": number
}

Return ONLY the JSON object. No markdown fences, no explanation.`

  return prompt
}

export function parseDetectionResponse(response: string): Record<string, unknown> | null {
  try {
    let cleaned = response.trim()

    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7)
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3)
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3)
    }

    cleaned = cleaned.trim()

    return JSON.parse(cleaned) as Record<string, unknown>
  } catch (error) {
    console.error('[v0] Failed to parse detection response:', error)
    return null
  }
}
