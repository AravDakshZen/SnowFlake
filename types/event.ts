export interface IssueCategory {
  id: string
  label: string
  description: string
  priority: number
  terminalTag: string
  estimatedMinutes: number
  promptInstructions: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
}

export const ISSUE_CATEGORIES: IssueCategory[] = [
  {
    id: 'critical_errors',
    label: 'Critical errors',
    description: 'Crashes, unhandled exceptions, TypeErrors, ReferenceErrors, null pointer dereferences. These break your app right now.',
    priority: 1,
    terminalTag: '[CRITICAL]',
    estimatedMinutes: 2,
    severity: 'critical',
    promptInstructions: `
      Priority 1 — CRITICAL ERRORS (fix these first, no exceptions):
      - Null/undefined property access without guards (TypeError)
      - Undeclared or out-of-scope variables (ReferenceError)
      - Uncaught exceptions in async functions
      - Missing try/catch around database or network calls
      - Stack overflow from infinite recursion
      - Import/require of non-existent modules
      - Syntax errors that prevent the file from parsing
      Fix every single one of these before moving to any other category.
    `
  },
  {
    id: 'security',
    label: 'Security vulnerabilities',
    description: 'Hardcoded secrets, SQL injection risks, missing input sanitization, exposed API keys, unsafe eval.',
    priority: 2,
    terminalTag: '[SECURITY]',
    estimatedMinutes: 3,
    severity: 'high',
    promptInstructions: `
      Priority 2 — SECURITY ISSUES (fix after critical errors):
      - Hardcoded API keys, tokens, passwords, or secrets in code
      - SQL queries built with string concatenation (injection risk)
      - User input used directly without sanitization
      - eval() or Function() called with dynamic input
      - Sensitive data logged to console in production
      - Authentication checks that can be bypassed
      - CORS headers set to wildcard * in production code
      - JWT tokens not validated before use
      Fix all security issues completely before moving to warnings.
    `
  },
  {
    id: 'logic_errors',
    label: 'Logic and runtime warnings',
    description: 'Wrong operators, NaN-producing math, incorrect comparisons, off-by-one errors, silent failures.',
    priority: 3,
    terminalTag: '[LOGIC]',
    estimatedMinutes: 3,
    severity: 'medium',
    promptInstructions: `
      Priority 3 — LOGIC ERRORS AND WARNINGS:
      - Assignment operator = used instead of === in conditionals
      - NaN produced from undefined values in math operations
      - Loose equality == instead of strict === where type matters
      - Off-by-one errors in array loops (> vs >= etc.)
      - Incorrect HTTP status codes returned (200 on error, etc.)
      - Promises not awaited where they should be
      - Race conditions in concurrent async operations
      - Silent error swallowing (empty catch blocks)
      - Boolean logic errors (& vs &&, | vs ||)
      Fix all logic errors before addressing code quality issues.
    `
  },
  {
    id: 'code_quality',
    label: 'Code quality and maintainability',
    description: 'Dead code, unused variables, duplicate imports, overly complex functions, missing validation.',
    priority: 4,
    terminalTag: '[QUALITY]',
    estimatedMinutes: 4,
    severity: 'low',
    promptInstructions: `
      Priority 4 — CODE QUALITY IMPROVEMENTS:
      - Unused variables and imports (remove them)
      - Dead code after return statements (remove it)
      - Functions longer than 50 lines (split if safe to do so)
      - Duplicate or redundant imports
      - Magic numbers that should be named constants
      - Missing input validation on exported functions
      - Overly nested conditionals (> 3 levels deep)
      - var declarations that should be const or let
      - Callback patterns that can safely be async/await
      - Missing JSDoc on exported functions
      Make all quality improvements without changing behavior.
    `
  },
  {
    id: 'style_cleanup',
    label: 'Style and consistency',
    description: 'Console.logs, formatting, naming conventions, redundant comments, style inconsistencies.',
    priority: 5,
    terminalTag: '[STYLE]',
    estimatedMinutes: 2,
    severity: 'info',
    promptInstructions: `
      Priority 5 — STYLE AND CLEANUP (last, lowest priority):
      - console.log, console.debug, console.warn left in production
      - Inconsistent quote style (mix of single and double quotes)
      - Missing or inconsistent semicolons
      - Comments that just restate what the code does
      - Variable names that are single letters (except loop counters)
      - Trailing whitespace and inconsistent indentation
      - TODO comments that are outdated or already resolved
      Apply style fixes last, after all functional issues are resolved.
    `
  }
]

export function getCategoryById(id: string): IssueCategory | undefined {
  return ISSUE_CATEGORIES.find(c => c.id === id)
}

export function getSelectedCategories(categoryIds: string[]): IssueCategory[] {
  return ISSUE_CATEGORIES
    .filter(c => categoryIds.includes(c.id))
    .sort((a, b) => a.priority - b.priority)
}

export function calculateEstimatedMinutes(categoryIds: string[], fileCount: number = 1): number {
  const categories = getSelectedCategories(categoryIds)
  const categoryTime = categories.reduce((sum, c) => sum + c.estimatedMinutes, 0)
  const fileTime = fileCount * 0.5
  return categoryTime + fileTime
}
