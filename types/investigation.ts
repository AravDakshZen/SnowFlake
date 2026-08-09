export interface Issue {
  id?: string
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  priority?: number
  line: number
  description: string
  before: string
  after: string
  reason: string
}

export interface IssueReport {
  totalFound: number
  totalFixed: number
  byCategory: Record<string, number>
}

export interface FileCleanResult {
  filePath: string
  originalContent: string
  cleanedContent: string
  patchDiff: string
  originalSHA: string
  issueReport: IssueReport
  issues: Issue[]
  linesChanged: number
  issuesFixed: number
}

export interface PassModelInfo {
  provider: string
  model: string
  tokensUsed: number
  latencyMs: number
}

export interface ModelsUsed {
  pass1?: PassModelInfo
  pass2?: PassModelInfo
  pass3?: PassModelInfo
  pass4?: PassModelInfo
}

export interface InvestigationData {
  id: string
  projectId: string
  userId?: string
  logId?: string | null
  clusterId?: string | null
  eventId?: string | null
  question?: string
  rootCause?: string
  affectedFile?: string
  affectedLine?: number
  patchDiff?: string
  suggestedFix?: string
  confidence?: number
  confidenceReasoning?: string
  fixStrategy?: string
  explanation?: string
  status: 'queued' | 'in_progress' | 'completed' | 'failed'
  prUrl?: string
  prNumber?: number
  branch?: string
  attempt?: number
  categoryIds?: string[]
  fileResults?: FileCleanResult[]
  modelsUsed?: ModelsUsed
  totalEstimatedMinutes?: number
  createdAt?: string
  updatedAt?: string
}
