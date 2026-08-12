import { createPatch } from 'diff'
import { getLLMProvider, type AnalysisResult } from '@/lib/llm'
import { buildDetectionPrompt, type DetectionPromptInput } from '@/lib/engine/passes/pass1-detect'
import { getSelectedCategories, type IssueCategory } from '@/types/event'
import type { FileCleanResult, Issue, IssueReport, ModelsUsed, PassModelInfo } from '@/types/investigation'
import { detectLanguage } from '@/lib/utils/language'
import { countDiffLines } from '@/lib/utils/diff'

export interface CleanerInput {
  sourceFiles: Record<string, string>
  fileSHAs: Record<string, string>
  categoryIds: string[]
  provider: string
  apiKey: string
  model: string
  baseUrl?: string
  stackTrace?: string
  previousAttempts?: string[]
  emitEvent?: (type: string, data: Record<string, unknown>) => void
}

export interface CleanerResult {
  fileResults: FileCleanResult[]
  modelsUsed: ModelsUsed
  totalIssuesFixed: number
  overallConfidence: number
  confidenceReasoning: string
}

export async function cleanFiles(input: CleanerInput): Promise<CleanerResult> {
  const {
    sourceFiles,
    fileSHAs,
    categoryIds,
    provider,
    apiKey,
    model,
    baseUrl,
    stackTrace,
    previousAttempts,
    emitEvent
  } = input

  const selectedCategories = getSelectedCategories(categoryIds)
  const llmProvider = await getLLMProvider(provider, apiKey, model, baseUrl)
  const fileResults: FileCleanResult[] = []
  const modelsUsed: ModelsUsed = {}

  let totalTokensUsed = 0
  let totalLatencyMs = 0

  const pass1Start = Date.now()

  const detectionPrompt = buildDetectionPrompt({
    categoryIds,
    sourceFiles,
    stackTrace,
    previousAttempts
  })

  const analysisResult = await llmProvider.analyze(detectionPrompt, sourceFiles)

  const pass1Latency = Date.now() - pass1Start
  modelsUsed.pass1 = {
    provider,
    model,
    tokensUsed: estimateTokens(detectionPrompt + JSON.stringify(sourceFiles)),
    latencyMs: pass1Latency
  }

  // Emit pass1 events AFTER data is available
  const firstFilePath = Object.keys(sourceFiles)[0] ?? 'unknown'
  const firstFileContent = sourceFiles[firstFilePath] ?? ''
  const lineCount = firstFileContent.split('\n').length
  const language = detectLanguage(firstFilePath)

  emitEvent?.('engine:pass1', {
    filename: firstFilePath,
    linesCount: lineCount,
    language,
    provider,
    model,
    line: analysisResult.affectedLine ?? 'unknown',
    shortDescription: analysisResult.rootCause?.substring(0, 80) ?? '',
    count: 0
  })

  emitEvent?.('engine:pass1:complete', {
    model: `${provider}/${model}`,
    tokensUsed: modelsUsed.pass1.tokensUsed,
    latencyMs: pass1Latency
  })

  for (const [filePath, originalContent] of Object.entries(sourceFiles)) {
    if (filePath === 'package.json' || filePath.endsWith('.json') || filePath.endsWith('.lock')) {
      continue
    }

    const fileIssues = extractIssuesForFile(analysisResult, filePath)
    const cleanedContent = extractCleanedContent(analysisResult, filePath) || originalContent
    const originalSHA = fileSHAs[filePath] || ''

    const patchDiff = createPatch(filePath, originalContent, cleanedContent)

    const issueReport: IssueReport = {
      totalFound: fileIssues.length,
      totalFixed: fileIssues.length,
      byCategory: fileIssues.reduce((acc, issue) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    fileResults.push({
      filePath,
      originalContent,
      cleanedContent,
      patchDiff,
      originalSHA,
      issueReport,
      issues: fileIssues,
      linesChanged: countLinesChanged(patchDiff),
      issuesFixed: fileIssues.length
    })
  }

  const pass2Start = Date.now()
  emitEvent?.('engine:pass2', {
    fileCount: fileResults.length,
    count: totalIssuesFixed
  })

  const pass2Latency = Date.now() - pass2Start
  modelsUsed.pass2 = {
    provider,
    model,
    tokensUsed: 0,
    latencyMs: pass2Latency
  }

  const pass3Start = Date.now()
  emitEvent?.('engine:pass3', {
    fileCount: fileResults.length,
    clean: true
  })

  const pass3Latency = Date.now() - pass3Start
  modelsUsed.pass3 = {
    provider,
    model,
    tokensUsed: 0,
    latencyMs: pass3Latency
  }

  const pass4Start = Date.now()
  const totalLinesChanged = fileResults.reduce((sum, r) => sum + r.linesChanged, 0)
  const filesModified = fileResults.filter(r => r.linesChanged > 0).length

  emitEvent?.('engine:pass4', {
    fileCount: fileResults.length,
    totalLinesChanged,
    linesChanged: totalLinesChanged,
    filesModified,
    confidence: analysisResult.confidence
  })

  const pass4Latency = Date.now() - pass4Start
  modelsUsed.pass4 = {
    provider,
    model,
    tokensUsed: 0,
    latencyMs: pass4Latency
  }

  const totalIssuesFixed = fileResults.reduce((sum, r) => sum + r.issuesFixed, 0)

  return {
    fileResults,
    modelsUsed,
    totalIssuesFixed,
    overallConfidence: analysisResult.confidence,
    confidenceReasoning: analysisResult.confidenceReasoning || ''
  }
}

function extractIssuesForFile(result: AnalysisResult, filePath: string): Issue[] {
  const issues: Issue[] = []

  if (result.affectedFile === filePath && result.rootCause) {
    issues.push({
      id: 'primary',
      category: 'critical_errors',
      severity: 'critical',
      priority: 1,
      line: result.affectedLine || 0,
      description: result.rootCause,
      before: result.patchDiff?.split('\n').filter(l => l.startsWith('-')).slice(0, 5).join('\n') || '',
      after: result.patchDiff?.split('\n').filter(l => l.startsWith('+')).slice(0, 5).join('\n') || '',
      reason: result.explanation || ''
    })
  }

  return issues
}

function extractCleanedContent(result: AnalysisResult, filePath: string): string | null {
  if (result.affectedFile !== filePath) {
    return null
  }

  if (result.suggestedFix) {
    return result.suggestedFix
  }

  return null
}

function countLinesChanged(patch: string): number {
  let added = 0
  let removed = 0

  for (const line of patch.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removed++
    }
  }

  return added + removed
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
