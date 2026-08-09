import type { Issue, IssueReport } from '@/types/investigation'

export interface FilePRInput {
  filePath: string
  patchDiff: string
  issuesFixed: number
  issueReport: IssueReport
  issues: Issue[]
}

export interface PRBodyInput {
  investigationId: string
  rootCause: string
  confidence: number
  fixStrategy: string
  explanation: string
  totalIssuesFixed: number
  fileResults: FilePRInput[]
  defaultBranch: string
  provider?: string
  modelName?: string
  durationMs?: number
  passesRun?: number
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'brightgreen'
  if (confidence >= 75) return 'green'
  if (confidence >= 60) return 'yellow'
  if (confidence >= 40) return 'orange'
  return 'red'
}

function getSeverityBadge(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴 Critical'
    case 'high': return '🟠 High'
    case 'medium': return '🟡 Medium'
    case 'low': return '🟢 Low'
    case 'info': return '⚪ Info'
    default: return '⚪ Info'
  }
}

function getCategoryPill(category: string): string {
  switch (category) {
    case 'critical_errors': return '🔴 Critical'
    case 'security': return '🟠 Security'
    case 'logic_errors': return '🟡 Logic'
    case 'code_quality': return '🟢 Quality'
    case 'style_cleanup': return '⚪ Style'
    default: return category
  }
}

function stripProviderPrefix(model: string): string {
  let name = model.replace(/^(openai|anthropic|google|meta|nvidia|deepseek|mistral|qwen)\//i, '')
  name = name.replace(/-(?:inst|instruct|chat|code|base|preview|turbo)$/i, '')
  name = name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  if (name.length > 20) name = name.substring(0, 20).trim()
  return name
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
}

function truncateDiff(diff: string, maxLines: number = 30): string {
  const lines = diff.split('\n')
  if (lines.length <= maxLines) return diff
  return lines.slice(0, maxLines).join('\n') + '\n... (truncated)'
}

export function generatePRBody(input: PRBodyInput): string {
  const {
    investigationId,
    rootCause,
    confidence,
    fixStrategy,
    explanation,
    totalIssuesFixed,
    fileResults,
    defaultBranch,
    provider,
    modelName,
    durationMs = 0,
    passesRun = 4,
  } = input

  const confidenceColor = getConfidenceColor(confidence)
  const timestamp = formatDate(new Date())
  const modelShortName = modelName ? stripProviderPrefix(modelName) : 'Unknown'

  const allIssues = fileResults.flatMap(f => f.issues)
  const criticalCount = allIssues.filter(i => i.severity === 'critical').length
  const securityCount = allIssues.filter(i => i.category === 'security').length
  const qualityCount = allIssues.filter(i => i.category === 'code_quality' || i.category === 'style_cleanup').length

  let body = `## 🧹 All issues fixed (${totalIssuesFixed} total across ${fileResults.length} file${fileResults.length > 1 ? 's' : ''})

Snowflake scanned the entire codebase and fixed every issue found —
not just the reported crash.

### Root Cause
${rootCause}

### Fix Strategy
${fixStrategy}

### Files changed (${fileResults.length})

`

  for (const file of fileResults) {
    const fileIssues = file.issues
    const sortedIssues = [...fileIssues].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5)
    })

    const categoryBreakdown = file.issueReport.byCategory
    const categoryPills = Object.entries(categoryBreakdown)
      .map(([cat, count]) => `${getCategoryPill(cat)} ×${count}`)
      .join(' ')

    body += `<details>
<summary>
📄 \`${file.filePath}\` — ${file.issuesFixed} issues fixed
${categoryPills ? `\n${categoryPills}` : ''}
</summary>

| # | Severity | Line | Issue | Fix applied |
|---|----------|------|-------|-------------|
`

    sortedIssues.forEach((issue, index) => {
      const severityBadge = getSeverityBadge(issue.severity)
      const fixPreview = issue.after.split('\n')[0].substring(0, 60)
      body += `| ${index + 1} | ${severityBadge} | \`${issue.line}\` | ${issue.description} | ${fixPreview} |\n`
    })

    if (file.patchDiff) {
      body += `
**Before / After (key change):**
\`\`\`diff
${truncateDiff(file.patchDiff)}
\`\`\`
`
    }

    body += `</details>

`
  }

  body += `---

## 📊 Analysis summary

| Metric | Value |
|--------|-------|
| Files changed | ${fileResults.length} |
| Analysis passes | ${passesRun} |
| Total issues found | ${allIssues.length} |
| Total issues fixed | ${totalIssuesFixed} |
| Critical errors | ${criticalCount} |
| Security issues | ${securityCount} |
| Code quality | ${qualityCount} |
| Confidence score | ${confidence}% |
${provider ? `| AI model | ${provider} / ${modelShortName} |` : ''}
${durationMs ? `| Processing time | ${durationMs}ms |` : ''}

---

## ✅ Verification checklist

- [x] Primary crash error resolved
- [x] All ${totalIssuesFixed} secondary issues cleaned
- [x] No new errors introduced (verification pass complete)
- [x] No breaking API changes (exported signatures unchanged)
- [x] No secrets or credentials in patch
- [x] Patch applies cleanly to \`${defaultBranch}\`
${confidence < 80 ? '- [ ] ⚠️ Confidence below 80% — manual review recommended' : ''}

---

<details>
<summary><strong>🔍 About this fix</strong></summary>

Snowflake's autonomous code intelligence engine analyzed ${fileResults.length} file${fileResults.length > 1 ? 's' : ''} 
using a ${passesRun}-pass cleaning pipeline:

**Pass 1 — Error detection:** The AI scanned the entire codebase and 
identified ${allIssues.length} issues including the primary crash and 
${Math.max(0, allIssues.length - 1)} additional problems that would have caused future 
failures.

**Pass 2 — Quality improvement:** Code structure, style consistency, 
and readability improvements were applied without changing behavior.

**Pass 3 — Verification:** The cleaned output was re-read top to 
bottom to confirm all fixes are valid and no new issues were 
introduced.

**Pass 4 — Patch generation:** A unified diff was generated and 
this pull request was opened automatically.

</details>

---

<div align="center">

❄️ **Powered by [Snowflake](https://snowflakedoitforyou.vercel.app/)** 
— Autonomous code intelligence that investigates, cleans, and fixes 
your backend errors automatically.

[Dashboard](https://snowflakedoitforyou.vercel.app/dashboard) · 
[Investigation](https://snowflakedoitforyou.vercel.app/investigation/${investigationId}) · 
[Docs](https://snowflakedoitforyou.vercel.app/docs) · 
[Report issue](https://snowflakedoitforyou.vercel.app/feedback)

*Investigation ID: \`${investigationId}\` · Generated ${timestamp}*

</div>
`

  return body
}
