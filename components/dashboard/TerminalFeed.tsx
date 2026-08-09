'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Copy, Download, Trash2 } from 'lucide-react'

type FeedEvent = { type: string; timestamp?: string; message?: string; [key: string]: unknown }

interface TerminalLine {
  timestamp: string
  tag: string
  tagColor: string
  message: string
}

const TAG_COLORS: Record<string, string> = {
  INIT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  FETCH: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  SCAN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'PASS 1': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'PASS 2': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'PASS 3': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'PASS 4': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  FIX: 'bg-green-500/10 text-green-400 border-green-500/20',
  WARN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PATCH: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PR: 'bg-green-500/10 text-green-400 border-green-500/20',
  CI: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  ERROR: 'bg-red-500/10 text-red-400 border-red-500/20',
  DONE: 'bg-green-500/10 text-green-300 border-green-500/20',
}

function formatTime(ts?: string): string {
  const d = ts ? new Date(ts) : new Date()
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function mapEventToLines(event: FeedEvent): TerminalLine[] {
  const t = formatTime(event.timestamp)
  const d = event as Record<string, unknown>
  switch (event.type) {
    case 'log:received':
      return [
        { timestamp: t, tag: 'INIT', tagColor: TAG_COLORS.INIT, message: `New error log received — ${d.endpoint ?? ''} returned ${d.statusCode ?? ''}` },
        { timestamp: t, tag: 'INIT', tagColor: TAG_COLORS.INIT, message: `Stack trace captured (${d.lineCount ?? '?'} lines) — queuing investigation` },
      ]
    case 'log:fingerprinted':
      return [
        { timestamp: t, tag: 'SCAN', tagColor: TAG_COLORS.SCAN, message: `Fingerprinting error... similarity score: ${d.similarityScore ?? '?'}%` },
        { timestamp: t, tag: 'SCAN', tagColor: TAG_COLORS.SCAN, message: d.isDuplicate ? `Duplicate detected — linked to cluster #${String(d.clusterId ?? '').slice(0, 6)}` : 'New error pattern — creating fresh investigation' },
      ]
    case 'investigation:queued':
      return [
        { timestamp: t, tag: 'INIT', tagColor: TAG_COLORS.INIT, message: `Investigation #${String(d.investigationId ?? '').slice(0, 8)} queued (position ${d.queuePosition ?? '?'})` },
        { timestamp: t, tag: 'FETCH', tagColor: TAG_COLORS.FETCH, message: `Connecting to GitHub — ${d.owner ?? ''}/${d.repo ?? ''}` },
      ]
    case 'engine:pass1':
      return [
        { timestamp: t, tag: 'FETCH', tagColor: TAG_COLORS.FETCH, message: `Fetching source file: ${d.filename ?? ''}` },
        { timestamp: t, tag: 'FETCH', tagColor: TAG_COLORS.FETCH, message: `File loaded — ${d.linesCount ?? '?'} lines of ${d.language ?? ''} code` },
        { timestamp: t, tag: 'PASS 1', tagColor: TAG_COLORS['PASS 1'], message: 'Starting error detection pass...' },
        { timestamp: t, tag: 'PASS 1', tagColor: TAG_COLORS['PASS 1'], message: `Sending to ${d.model ?? 'LLM'} for analysis...` },
        { timestamp: t, tag: 'PASS 1', tagColor: TAG_COLORS['PASS 1'], message: `Primary error located — line ${d.line ?? '?'}: ${d.shortDescription ?? ''}` },
        { timestamp: t, tag: 'PASS 1', tagColor: TAG_COLORS['PASS 1'], message: 'Scanning entire file for secondary issues...' },
        { timestamp: t, tag: 'PASS 1', tagColor: TAG_COLORS['PASS 1'], message: `Found ${d.count ?? '?'} additional issues to clean` },
      ]
    case 'engine:issue': {
      const sev = String(d.severity ?? 'INFO').toUpperCase()
      const tag = sev === 'CRITICAL' || sev === 'HIGH' ? 'FIX' : 'WARN'
      return [{ timestamp: t, tag, tagColor: TAG_COLORS[tag], message: `[${sev}] ${d.description ?? ''} at line ${d.line ?? '?'} — ${tag === 'FIX' ? 'fixing' : 'cleaning'}` }]
    }
    case 'engine:pass2':
      return [
        { timestamp: t, tag: 'PASS 2', tagColor: TAG_COLORS['PASS 2'], message: 'Error fixes complete — starting quality pass' },
        { timestamp: t, tag: 'PASS 2', tagColor: TAG_COLORS['PASS 2'], message: 'Improving code structure and readability...' },
        { timestamp: t, tag: 'PASS 2', tagColor: TAG_COLORS['PASS 2'], message: `${d.count ?? '?'} quality improvements applied` },
      ]
    case 'engine:pass3':
      return [
        { timestamp: t, tag: 'PASS 3', tagColor: TAG_COLORS['PASS 3'], message: 'Verifying cleaned output...' },
        { timestamp: t, tag: 'PASS 3', tagColor: TAG_COLORS['PASS 3'], message: 'Re-reading entire file top to bottom' },
        { timestamp: t, tag: 'PASS 3', tagColor: TAG_COLORS['PASS 3'], message: d.clean ? 'All checks passed — file is production ready' : 'Issue detected in verification — re-cleaning...' },
      ]
    case 'engine:pass4':
      return [
        { timestamp: t, tag: 'PASS 4', tagColor: TAG_COLORS['PASS 4'], message: 'Generating unified diff patch...' },
        { timestamp: t, tag: 'PASS 4', tagColor: TAG_COLORS['PASS 4'], message: `${d.linesChanged ?? '?'} lines changed across ${d.filesModified ?? '?'} files` },
        { timestamp: t, tag: 'PATCH', tagColor: TAG_COLORS.PATCH, message: `Patch ready — confidence score: ${d.confidence ?? '?'}%` },
      ]
    case 'pr:created':
      return [
        { timestamp: t, tag: 'PR', tagColor: TAG_COLORS.PR, message: `Creating branch: ${d.branchName ?? ''}` },
        { timestamp: t, tag: 'PR', tagColor: TAG_COLORS.PR, message: `Committing patch with message: "${d.commitTitle ?? ''}"` },
        { timestamp: t, tag: 'PR', tagColor: TAG_COLORS.PR, message: `Pull request opened: #${d.prNumber ?? '?'}` },
        { timestamp: t, tag: 'PR', tagColor: TAG_COLORS.PR, message: `View PR → ${d.prUrl ?? ''}` },
      ]
    case 'ci:watching':
      return [
        { timestamp: t, tag: 'CI', tagColor: TAG_COLORS.CI, message: `Watching CI pipeline on ${d.repoName ?? ''}...` },
        { timestamp: t, tag: 'CI', tagColor: TAG_COLORS.CI, message: `Workflow: ${d.workflowName ?? ''} — status: running` },
      ]
    case 'ci:failed_reinvestigating':
      return [
        { timestamp: t, tag: 'ERROR', tagColor: TAG_COLORS.ERROR, message: 'CI failed — patch did not pass tests' },
        { timestamp: t, tag: 'ERROR', tagColor: TAG_COLORS.ERROR, message: `Attempt ${d.attempt ?? '?'}/3 — starting re-investigation` },
        { timestamp: t, tag: 'INIT', tagColor: TAG_COLORS.INIT, message: 'Fetching CI failure log from GitHub Actions...' },
      ]
    case 'alert:escalated':
      return [
        { timestamp: t, tag: 'ERROR', tagColor: TAG_COLORS.ERROR, message: 'All 3 attempts failed — escalating to team' },
        { timestamp: t, tag: 'ERROR', tagColor: TAG_COLORS.ERROR, message: 'Slack alert sent · Email alert sent' },
      ]
    case 'investigation:complete':
      return [
        { timestamp: t, tag: 'DONE', tagColor: TAG_COLORS.DONE, message: `Investigation complete — ${d.totalIssuesFixed ?? '?'} issues fixed` },
        { timestamp: t, tag: 'DONE', tagColor: TAG_COLORS.DONE, message: `Confidence: ${d.confidence ?? '?'}% · Lines changed: ${d.linesChanged ?? '?'}` },
        { timestamp: t, tag: 'DONE', tagColor: TAG_COLORS.DONE, message: `❄️ Snowflake investigation #${String(d.investigationId ?? '').slice(0, 8)} closed` },
      ]
    default:
      return mapRawEvent(event)
  }
}

function mapRawEvent(event: FeedEvent): TerminalLine[] {
  const t = formatTime(event.timestamp)
  const d = event as Record<string, unknown>
  const msg = (d.message as string) || ''

  switch (event.type) {
    case 'connected':
      return [{ timestamp: t, tag: 'INIT', tagColor: TAG_COLORS.INIT, message: 'Live stream connected' }]
    case 'event:started':
      return [{ timestamp: t, tag: 'INIT', tagColor: TAG_COLORS.INIT, message: msg || `Event "${d.name ?? ''}" started analyzing ${d.repo ?? ''}` }]
    case 'event:progress': {
      const stage = String(d.stage ?? '')
      const provider = String(d.provider ?? '')
      const model = String(d.model ?? '')
      if (stage === 'fetching_commit') {
        return [{ timestamp: t, tag: 'FETCH', tagColor: TAG_COLORS.FETCH, message: msg || `Fetching commit ${String(d.commitSha ?? '').substring(0, 7)}` }]
      }
      if (stage === 'analyzing' && provider) {
        return [{ timestamp: t, tag: 'PASS 1', tagColor: TAG_COLORS['PASS 1'], message: msg || `Analyzing with ${provider}/${model}` }]
      }
      return [{ timestamp: t, tag: 'INIT', tagColor: TAG_COLORS.INIT, message: msg || `Progress: ${stage || 'unknown'}` }]
    }
    case 'llm:fallback':
      return [{ timestamp: t, tag: 'WARN', tagColor: TAG_COLORS.WARN, message: msg || `Falling back from ${d.fromProvider ?? ''} to ${d.provider ?? ''}` }]
    case 'event:completed':
      return [
        { timestamp: t, tag: 'DONE', tagColor: TAG_COLORS.DONE, message: msg || `Event "${d.name ?? ''}" completed` },
        { timestamp: t, tag: 'DONE', tagColor: TAG_COLORS.DONE, message: `Root cause: ${String(d.rootCause ?? d.message ?? '').substring(0, 80)}` },
      ]
    case 'event:failed':
      return [{ timestamp: t, tag: 'ERROR', tagColor: TAG_COLORS.ERROR, message: msg || `Event failed: ${String(d.error ?? '').substring(0, 100)}` }]
    case 'investigation:progress': {
      const stage = String(d.stage ?? '')
      if (stage === 'analyzing') {
        return [{ timestamp: t, tag: 'PASS 1', tagColor: TAG_COLORS['PASS 1'], message: 'LLM analyzing stack trace and source files...' }]
      }
      return [{ timestamp: t, tag: 'INIT', tagColor: TAG_COLORS.INIT, message: msg || `Investigation progress: ${stage}` }]
    }
    default:
      return [{ timestamp: t, tag: 'INIT', tagColor: TAG_COLORS.INIT, message: msg || labels[event.type] || event.type }]
  }
}

const labels: Record<string, string> = {
  connected: 'Live stream connected',
  'investigation:progress': 'Investigation in progress',
  'event:created': 'Automation event created',
  'event:started': 'Event analysis started',
  'event:completed': 'Event analysis complete',
  'event:failed': 'Event analysis failed',
  'llm:fallback': 'Falling back to another provider',
}

type AuditLog = { id: string; action: string; entity_id: string | null; metadata: Record<string, unknown> | null; created_at: string }

function auditToFeedEvent(log: AuditLog): FeedEvent | null {
  const meta = log.metadata ?? {}
  switch (log.action) {
    case 'log_ingested': return { type: 'log:received', timestamp: log.created_at, endpoint: meta.endpoint, statusCode: meta.statusCode }
    case 'investigation_queued': return { type: 'investigation:queued', timestamp: log.created_at, investigationId: log.entity_id }
    case 'investigation_complete': return { type: 'investigation:complete', timestamp: log.created_at, investigationId: log.entity_id, totalIssuesFixed: meta.totalIssuesFixed, confidence: meta.confidence }
    case 'pr_created': return { type: 'pr:created', timestamp: log.created_at, prUrl: meta.prUrl, prNumber: meta.prNumber }
    default: return null
  }
}

const STORAGE_KEY = 'snowflake-terminal-lines'

export function TerminalFeed({ projectId, limit = 100 }: { projectId?: string; limit?: number }) {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeInvestigation, setActiveInvestigation] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const linesRef = useRef<TerminalLine[]>([])

  const scrollToBottom = useCallback(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight
    }
  }, [])

  // Persist lines to localStorage
  const persistLines = useCallback((newLines: TerminalLine[]) => {
    linesRef.current = newLines
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLines.slice(-limit)))
    } catch {}
  }, [limit])

  // Restore lines from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as TerminalLine[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLines(parsed)
          linesRef.current = parsed
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  // SSE stream for live events
  useEffect(() => {
    if (!projectId) return
    let cancelled = false

    const source = new EventSource(`/api/logs/stream?projectId=${encodeURIComponent(projectId)}`)
    source.onopen = () => setConnected(true)
    source.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as Record<string, unknown>
        if (raw.type === 'heartbeat') return
        
        // Flatten nested data property from events
        const next: FeedEvent = {
          type: raw.type as string,
          timestamp: raw.timestamp as string,
          ...(typeof raw.data === 'object' && raw.data !== null ? raw.data as Record<string, unknown> : raw),
        }
        
        if (next.type === 'investigation:queued') setActiveInvestigation(true)
        if (next.type === 'investigation:complete' || next.type === 'alert:escalated') setActiveInvestigation(false)
        const newLines = mapEventToLines(next)
        setLines(prev => {
          const updated = [...prev, ...newLines].slice(-limit)
          persistLines(updated)
          return updated
        })
      } catch {}
    }
    source.onerror = () => setConnected(false)
    return () => { cancelled = true; source.close() }
  }, [projectId, limit, persistLines])

  useEffect(() => { scrollToBottom() }, [lines, scrollToBottom])

  const handleClear = () => {
    setLines([])
    linesRef.current = []
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }
  const handleCopy = () => {
    const text = lines.map(l => `[${l.timestamp}] [${l.tag}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }
  const handleExport = () => {
    const text = lines.map(l => `[${l.timestamp}] [${l.tag}] ${l.message}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snowflake-log.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-black/10 overflow-hidden bg-[#1a1a2e]">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#12121f] border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#FF5F57]" />
          <span className="size-3 rounded-full bg-[#FFBD2E]" />
          <span className="size-3 rounded-full bg-[#28C840]" />
          <span className="ml-3 text-xs text-white/40 font-[family-name:var(--font-mono)]">snowflake@tracewise: ~/investigation</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/30 font-[family-name:var(--font-mono)]">{lines.length} lines</span>
          <Separator orientation="vertical" className="h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-white/20'}`} />
            <span className="text-[11px] text-white/30">{connected ? 'Connected' : 'Waiting'}</span>
          </div>
          <Separator orientation="vertical" className="h-3 bg-white/10" />
          <Button variant="ghost" size="icon-sm" onClick={handleClear} className="text-white/40 hover:text-white/70 h-6 w-6">
            <Trash2 className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleCopy} className="text-white/40 hover:text-white/70 h-6 w-6">
            <Copy className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleExport} className="text-white/40 hover:text-white/70 h-6 w-6">
            <Download className="size-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Body */}
      <ScrollArea className="h-72" ref={scrollRef}>
        <div ref={viewportRef} className="p-4 font-[family-name:var(--font-mono)] text-sm">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-3 bg-white/5 animate-pulse rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
              ))}
            </div>
          ) : lines.length === 0 ? (
            <div className="text-emerald-400/60">
              <div>snowflake@tracewise:~$ waiting for errors...</div>
              <span className="anim-blink">█</span>
            </div>
          ) : (
            <>
              {!activeInvestigation && lines.length === 0 && (
                <div className="text-emerald-400/60 mb-2">
                  snowflake@tracewise:~$ snowflake investigate --auto
                </div>
              )}
              {lines.map((line, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5 anim-fade-up" style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}>
                  <span className="text-white/25 shrink-0">[{line.timestamp}]</span>
                  <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 h-5 font-[family-name:var(--font-mono)] ${line.tagColor}`}>
                    {line.tag}
                  </Badge>
                  <span className="text-emerald-400/80">{line.message}</span>
                </div>
              ))}
              <div className="text-emerald-400/60 mt-1">
                snowflake@tracewise:~$ <span className="anim-blink">█</span>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
