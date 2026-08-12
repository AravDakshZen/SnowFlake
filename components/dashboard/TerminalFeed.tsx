'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Copy, Download, Trash2, RefreshCw } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type FeedEvent = { type: string; timestamp?: string; message?: string; [key: string]: unknown }

interface TerminalLine {
  timestamp: string
  tag: string
  message: string
}

const TAG_CONFIG = {
  INIT:   { variant: 'outline', className: 'border-blue-400 text-blue-400', label: 'INIT' },
  FETCH:  { variant: 'outline', className: 'border-cyan-400 text-cyan-400', label: 'FETCH' },
  SCAN:   { variant: 'outline', className: 'border-amber-400 text-amber-400', label: 'SCAN' },
  'PASS 1': { variant: 'outline', className: 'border-orange-400 text-orange-400', label: 'PASS 1' },
  'PASS 2': { variant: 'outline', className: 'border-yellow-400 text-yellow-400', label: 'PASS 2' },
  'PASS 3': { variant: 'outline', className: 'border-purple-400 text-purple-400', label: 'PASS 3' },
  'PASS 4': { variant: 'outline', className: 'border-teal-400 text-teal-400', label: 'PASS 4' },
  FIX:    { variant: 'outline', className: 'border-green-400 text-green-400', label: 'FIX' },
  WARN:   { variant: 'outline', className: 'border-amber-500 text-amber-500', label: 'WARN' },
  PATCH:  { variant: 'outline', className: 'border-blue-500 text-blue-500', label: 'PATCH' },
  PR:     { variant: 'outline', className: 'border-green-500 text-green-500', label: 'PR' },
  CI:     { variant: 'outline', className: 'border-cyan-500 text-cyan-500', label: 'CI' },
  ERROR:  { variant: 'destructive', label: 'ERROR' },
  DONE:   { variant: 'outline', className: 'border-emerald-400 text-emerald-400 font-bold', label: 'DONE' },
  SKIP:   { variant: 'secondary', label: 'SKIP' },
  EVENT:  { variant: 'outline', className: 'border-violet-400 text-violet-400', label: 'EVENT' },
  CRITICAL: { variant: 'destructive', label: 'CRITICAL' },
  SECURITY: { variant: 'outline', className: 'border-orange-500 text-orange-600 bg-orange-500/10', label: 'SECURITY' },
  LOGIC:    { variant: 'outline', className: 'border-yellow-500 text-yellow-600 bg-yellow-500/10', label: 'LOGIC' },
  QUALITY:  { variant: 'outline', className: 'border-blue-400 text-blue-500 bg-blue-400/10', label: 'QUALITY' },
  STYLE:    { variant: 'secondary', label: 'STYLE' },
} as const

const TAG_DESCRIPTIONS: Record<string, string> = {
  'PASS 1': 'Error detection & analysis - Scans source code to identify root cause and secondary issues',
  'PASS 2': 'Quality improvements - Enhances code structure, readability, and applies best practices',
  'PASS 3': 'Verification pass - Validates all changes are production-ready and error-free',
  'PASS 4': 'Patch generation - Creates unified diff with confidence scoring',
}

function TerminalTagBadge({ tag }: { tag: string }) {
  const config = TAG_CONFIG[tag as keyof typeof TAG_CONFIG] ?? {
    variant: 'outline' as const, label: tag
  }
  return (
    <Badge
      variant={config.variant as any}
      className={`font-mono text-[10px] px-1.5 py-0 h-5 shrink-0 ${config.className ?? ''}`}
    >
      {config.label}
    </Badge>
  )
}

function formatTime(ts?: string): string {
  if (ts && ts.match(/^\d{2}:\d{2}:\d{2}$/)) return ts
  const d = ts ? new Date(ts) : new Date()
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function mapEventToLines(event: FeedEvent): TerminalLine[] {
  const t = formatTime(event.timestamp)
  const d = event as Record<string, unknown>
  switch (event.type) {
    case 'terminal:line':
      return [{
        timestamp: String(d.timestamp ?? t),
        tag: String(d.tag ?? 'INIT'),
        message: String(d.message ?? ''),
      }]
    case 'log:received':
      return [
        { timestamp: t, tag: 'INIT', message: `New error log received — ${d.endpoint ?? ''} returned ${d.statusCode ?? ''}` },
        { timestamp: t, tag: 'INIT', message: `Stack trace captured (${d.lineCount ?? '?'} lines) — queuing investigation` },
      ]
    case 'log:fingerprinted':
      return [
        { timestamp: t, tag: 'SCAN', message: `Fingerprinting error... similarity score: ${d.similarityScore ?? '?'}%` },
        { timestamp: t, tag: 'SCAN', message: d.isDuplicate ? `Duplicate detected — linked to cluster #${String(d.clusterId ?? '').slice(0, 6)}` : 'New error pattern — creating fresh investigation' },
      ]
    case 'investigation:queued':
      return [
        { timestamp: t, tag: 'INIT', message: `Investigation #${String(d.investigationId ?? '').slice(0, 8)} queued (position ${d.queuePosition ?? '?'})` },
        { timestamp: t, tag: 'FETCH', message: `Connecting to GitHub — ${d.owner ?? ''}/${d.repo ?? ''}` },
      ]
    case 'engine:pass1':
      return [
        { timestamp: t, tag: 'FETCH', message: `Fetching source file: ${d.filename ?? ''}` },
        { timestamp: t, tag: 'FETCH', message: `File loaded — ${d.linesCount ?? '?'} lines of ${d.language ?? ''} code` },
        { timestamp: t, tag: 'PASS 1', message: 'Starting error detection pass...' },
        { timestamp: t, tag: 'PASS 1', message: `Using ${d.provider ?? 'LLM'} / ${String(d.model ?? 'model').split('/').pop()} for detection pass` },
        { timestamp: t, tag: 'PASS 1', message: `Primary error located — line ${d.line ?? 'unknown'}: ${d.shortDescription ?? ''}` },
        { timestamp: t, tag: 'PASS 1', message: 'Scanning entire file for secondary issues...' },
        { timestamp: t, tag: 'PASS 1', message: `Found ${d.count ?? 0} additional issues to clean` },
      ]
    case 'engine:pass1:complete':
      return [
        { timestamp: t, tag: 'PASS 1', message: `Analysis complete — ${d.tokensUsed ?? '?'} tokens · ${d.latencyMs ?? '?'}ms` },
      ]
    case 'engine:pass2':
      return [
        { timestamp: t, tag: 'PASS 2', message: 'Error fixes complete — starting quality pass' },
        { timestamp: t, tag: 'PASS 2', message: 'Improving code structure and readability...' },
        { timestamp: t, tag: 'PASS 2', message: `${d.count ?? 0} quality improvements applied` },
      ]
    case 'engine:pass3':
      return [
        { timestamp: t, tag: 'PASS 3', message: 'Verifying cleaned output...' },
        { timestamp: t, tag: 'PASS 3', message: 'Re-reading entire file top to bottom' },
        { timestamp: t, tag: 'PASS 3', message: d.clean ? 'All checks passed — file is production ready' : 'Issue detected in verification — re-cleaning...' },
      ]
    case 'engine:pass4':
      return [
        { timestamp: t, tag: 'PASS 4', message: 'Generating unified diff patch...' },
        { timestamp: t, tag: 'PASS 4', message: `${d.linesChanged ?? 0} lines changed across ${d.filesModified ?? 0} file${d.filesModified !== 1 ? 's' : ''}` },
        { timestamp: t, tag: 'PATCH', message: `Patch ready — confidence score: ${d.confidence ?? 0}%` },
      ]
    case 'engine:category:start':
      return [
        { timestamp: t, tag: 'SCAN', message: `━━━ Pass: ${d.categoryLabel ?? ''} ━━━━━━━━━━━` },
        { timestamp: t, tag: String(d.terminalTag ?? 'SCAN'), message: `Scanning for ${d.description ?? ''}...` },
      ]
    case 'engine:category:complete':
      return [
        { timestamp: t, tag: String(d.terminalTag ?? 'SCAN'), message: `${d.count ?? 0} ${d.categoryLabel ?? ''} issues resolved ✓` },
      ]
    case 'engine:issue': {
      const sev = String(d.severity ?? 'INFO').toUpperCase()
      const tag = sev === 'CRITICAL' || sev === 'HIGH' ? 'FIX' : 'WARN'
      return [{ timestamp: t, tag, message: `[${sev}] ${d.description ?? ''} at line ${d.line ?? '?'} — ${tag === 'FIX' ? 'fixing' : 'cleaning'}` }]
    }
    case 'engine:model:used':
      return [
        { timestamp: t, tag: 'PASS 1', message: `Using ${d.provider ?? ''} / ${String(d.model ?? '').split('/').pop()} for ${d.pass ?? 'analysis'} pass` },
        { timestamp: t, tag: 'PASS 1', message: `Analysis complete — ${d.tokensUsed ?? '?'} tokens · ${d.latencyMs ?? '?'}ms` },
      ]
    case 'pr:created':
      return [
        { timestamp: t, tag: 'PR', message: `Creating branch: ${d.branchName ?? ''}` },
        { timestamp: t, tag: 'PR', message: `Committing patch with message: "${d.commitTitle ?? ''}"` },
        { timestamp: t, tag: 'PR', message: `Pull request opened: #${d.prNumber ?? '?'}` },
        { timestamp: t, tag: 'PR', message: `View PR → ${d.prUrl ?? ''}` },
      ]
    case 'ci:watching':
      return [
        { timestamp: t, tag: 'CI', message: `Watching CI pipeline on ${d.repoName ?? ''}...` },
        { timestamp: t, tag: 'CI', message: `Workflow: ${d.workflowName ?? ''} — status: running` },
      ]
    case 'ci:failed_reinvestigating':
      return [
        { timestamp: t, tag: 'ERROR', message: 'CI failed — patch did not pass tests' },
        { timestamp: t, tag: 'ERROR', message: `Attempt ${d.attempt ?? '?'}/3 — starting re-investigation` },
        { timestamp: t, tag: 'INIT', message: 'Fetching CI failure log from GitHub Actions...' },
      ]
    case 'alert:escalated':
      return [
        { timestamp: t, tag: 'ERROR', message: 'All 3 attempts failed — escalating to team' },
        { timestamp: t, tag: 'ERROR', message: 'Slack alert sent · Email alert sent' },
      ]
    case 'investigation:complete':
      return [
        { timestamp: t, tag: 'DONE', message: `Investigation complete — ${d.totalIssuesFixed ?? 0} issues fixed` },
        { timestamp: t, tag: 'DONE', message: `Confidence: ${d.confidence ?? 0}% · Lines changed: ${d.linesChanged ?? 0}` },
        { timestamp: t, tag: 'DONE', message: `❄️ Snowflake investigation #${String(d.investigationId ?? '').slice(0, 8)} closed` },
      ]
    case 'event:created':
      return [
        { timestamp: t, tag: 'EVENT', message: `Event "${d.name ?? ''}" created — waiting for trigger` },
      ]
    case 'event:started':
      return [
        { timestamp: t, tag: 'EVENT', message: `Event "${d.name ?? ''}" started analyzing ${d.repo ?? ''}` },
        { timestamp: t, tag: 'FETCH', message: `Fetching latest commit from ${d.repo ?? ''}` },
      ]
    case 'event:progress': {
      const stage = String(d.stage ?? '')
      if (stage === 'fetching_commit') {
        return [{ timestamp: t, tag: 'FETCH', message: `Fetching commit ${String(d.commitSha ?? '').substring(0, 7)}` }]
      }
      if (stage === 'analyzing') {
        return [{ timestamp: t, tag: 'PASS 1', message: `Analyzing with ${d.provider ?? ''}/${String(d.model ?? '').split('/').pop()}` }]
      }
      return [{ timestamp: t, tag: 'INIT', message: `Progress: ${stage || 'unknown'}` }]
    }
    case 'event:completed':
      return [
        { timestamp: t, tag: 'DONE', message: `Event "${d.name ?? ''}" analysis completed` },
        { timestamp: t, tag: 'DONE', message: `Root cause: ${String(d.rootCause ?? d.message ?? '').substring(0, 80)}` },
      ]
    case 'event:failed':
      return [{ timestamp: t, tag: 'ERROR', message: `Event failed: ${String(d.error ?? '').substring(0, 100)}` }]
    case 'llm:fallback':
      return [{ timestamp: t, tag: 'WARN', message: `Falling back from ${d.fromProvider ?? ''} to ${d.provider ?? ''} — reason: ${d.reason ?? 'provider unavailable'}` }]
    case 'llm:model_tried': {
      const success = d.success !== false
      return [{ timestamp: t, tag: success ? 'PASS 1' : 'WARN', message: `${success ? '✓' : '✗'} ${d.provider ?? ''}/${String(d.model ?? '').split('/').pop()} — ${success ? 'analysis succeeded' : String(d.error ?? 'failed').substring(0, 60)}` }]
    }
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
      return [{ timestamp: t, tag: 'INIT', message: 'Live stream connected' }]
    default:
      return [{ timestamp: t, tag: 'INIT', message: msg || labels[event.type] || event.type }]
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
  const [refreshing, setRefreshing] = useState(false)
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

  const handleRefresh = useCallback(async () => {
    if (!projectId) return
    setRefreshing(true)
    try {
      const res = await fetch(`/api/audit?projectId=${encodeURIComponent(projectId)}&limit=50`)
      const data = await res.json()
      if (data.logs) {
        const newLines: TerminalLine[] = []
        for (const log of data.logs) {
          const feedEvent = auditToFeedEvent(log)
          if (feedEvent) {
            newLines.push(...mapEventToLines(feedEvent))
          }
        }
        if (newLines.length > 0) {
          setLines(prev => {
            const existing = new Set(prev.map(l => `${l.timestamp}-${l.tag}-${l.message}`))
            const unique = newLines.filter(l => !existing.has(`${l.timestamp}-${l.tag}-${l.message}`))
            const updated = [...prev, ...unique].slice(-limit)
            persistLines(updated)
            return updated
          })
        }
      }
    } catch {}
    setRefreshing(false)
  }, [projectId, limit, persistLines])

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
          <span className="ml-3 text-xs text-white/40 font-[family-name:var(--font-mono)]">snowflake@snowflake: ~/investigation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-white/30 font-[family-name:var(--font-mono)]">{lines.length} lines</span>
          <Separator orientation="vertical" className="h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-white/20'}`} />
            <span className="text-[11px] text-white/30">{connected ? 'Connected' : 'Waiting'}</span>
          </div>
          <Separator orientation="vertical" className="h-3 bg-white/10" />
          <Button variant="ghost" size="icon-sm" onClick={handleRefresh} disabled={refreshing} className="text-white/40 hover:text-white/70 h-6 w-6" title="Refresh logs from server">
            <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleClear} className="text-white/40 hover:text-white/70 h-6 w-6" title="Clear logs">
            <Trash2 className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleCopy} className="text-white/40 hover:text-white/70 h-6 w-6" title="Copy logs">
            <Copy className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleExport} className="text-white/40 hover:text-white/70 h-6 w-6" title="Export logs">
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
              <div>snowflake@snowflake:~$ waiting for errors...</div>
              <span className="anim-blink">█</span>
            </div>
          ) : (
            <>
              {!activeInvestigation && lines.length === 0 && (
                <div className="text-emerald-400/60 mb-2">
                  snowflake@snowflake:~$ snowflake investigate --auto
                </div>
              )}
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2 font-mono text-sm py-0.5 anim-fade-up" style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}>
                  <span className="text-white/25 shrink-0 text-xs w-20">[{line.timestamp}]</span>
                  <TerminalTagBadge tag={line.tag} />
                  <span className="text-emerald-400/80 flex-1">{line.message}</span>
                </div>
              ))}
              <div className="text-emerald-400/60 mt-1">
                snowflake@snowflake:~$ <span className="anim-blink">█</span>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
