'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { GitPullRequest, ChevronDown, FileCode, Cpu, Clock, ExternalLink, Download, Bot } from 'lucide-react'
import type { ModelsUsed, PassModelInfo } from '@/types/investigation'
import { SeverityBadge } from '@/components/ui/SeverityBadge'

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getSeverity(statusCode?: number): { label: string; severity: 'critical' | 'high' | 'medium' | 'low' } {
  if (!statusCode) return { label: 'P3', severity: 'low' }
  if (statusCode >= 500) return { label: 'P0', severity: 'critical' }
  if (statusCode >= 400) return { label: 'P1', severity: 'high' }
  if (statusCode >= 300) return { label: 'P2', severity: 'medium' }
  return { label: 'P3', severity: 'low' }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'queued': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'completed': return 'bg-green-100 text-green-700 border-green-200'
    case 'failed': return 'bg-red-100 text-red-700 border-red-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'queued': return 'Queued'
    case 'in_progress': return 'Analyzing'
    case 'completed': return 'Patched'
    case 'failed': return 'Failed'
    default: return status
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'text-green-500'
  if (confidence >= 70) return 'text-teal-500'
  if (confidence >= 50) return 'text-amber-500'
  return 'text-red-500'
}

function ConfidenceArc({ confidence }: { confidence: number }) {
  const circumference = 2 * Math.PI * 20
  const offset = circumference - (circumference * confidence / 100)
  const colorClass = getConfidenceColor(confidence)

  return (
    <div className="relative size-12">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-black/10" />
        <circle
          cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-1000`}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${colorClass}`}>
        {confidence}%
      </span>
    </div>
  )
}

function PassCircles({ passes }: { passes: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map(n => (
        <span
          key={n}
          className={`size-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
            n <= passes
              ? 'bg-teal-500 text-white anim-count-pop'
              : 'bg-black/10 text-black/40'
          }`}
          style={{ animationDelay: `${n * 100}ms` }}
        >
          {n}
        </span>
      ))}
    </div>
  )
}

function ETACountdown({ createdAt, status }: { createdAt: string; status: string }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (status !== 'in_progress') {
      setRemaining(null)
      return
    }

    const startTime = new Date(createdAt).getTime()
    const estimatedDuration = 8 * 60 * 1000
    const estimatedEnd = startTime + estimatedDuration

    const updateRemaining = () => {
      const now = Date.now()
      const diff = estimatedEnd - now
      setRemaining(diff > 0 ? diff : 0)
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 30000)

    return () => clearInterval(interval)
  }, [createdAt, status])

  if (status !== 'in_progress' || remaining === null) return null

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  return (
    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 bg-amber-50">
      ~{minutes}:{seconds.toString().padStart(2, '0')} min left
    </Badge>
  )
}

function ModelsUsedPanel({ modelsUsed }: { modelsUsed?: ModelsUsed }) {
  const [expanded, setExpanded] = useState(false)

  if (!modelsUsed) return null

  const passes = [
    { key: 'pass1', label: 'Pass 1 — Detection', data: modelsUsed.pass1 },
    { key: 'pass2', label: 'Pass 2 — Quality', data: modelsUsed.pass2 },
    { key: 'pass3', label: 'Pass 3 — Verification', data: modelsUsed.pass3 },
    { key: 'pass4', label: 'Pass 4 — Output', data: modelsUsed.pass4 },
  ].filter(p => p.data)

  if (passes.length === 0) return null

  const totalTokens = passes.reduce((sum, p) => sum + (p.data?.tokensUsed || 0), 0)
  const totalLatency = passes.reduce((sum, p) => sum + (p.data?.latencyMs || 0), 0)

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-black/50 hover:text-black/70 h-6 px-2">
          <Bot className="h-3 w-3 mr-1" />
          {passes[0].data?.provider} / {passes[0].data?.model?.split('/').pop()?.substring(0, 20)}
          <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2">
          <CardContent className="p-3 space-y-2">
            {passes.map(({ key, label, data }) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-black/60">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{data?.provider}/{data?.model?.split('/').pop()}</span>
                  <span className="text-black/40">{data?.tokensUsed} tokens</span>
                  <span className="text-black/40">{data?.latencyMs}ms</span>
                </div>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-xs font-medium">
              <span>Total</span>
              <div className="flex items-center gap-2">
                <span>{totalTokens} tokens</span>
                <span>{totalLatency}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}

function InvestigationCard({ inv, index }: { inv: any; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const severity = getSeverity(inv.status_code)
  const stackLines = inv.root_cause ? inv.root_cause.split('\n').slice(0, 12) : []
  const modelsUsed: ModelsUsed | undefined = inv.models_used ? JSON.parse(inv.models_used) : undefined

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card
        className="anim-fade-up hover:border-black/15 hover:shadow-sm transition-all cursor-pointer"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <CollapsibleTrigger asChild>
          <CardContent className="p-5">
            {/* Top Row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{severity.label}</Badge>
                <Badge variant="outline" className={getStatusColor(inv.status)}>{getStatusLabel(inv.status)}</Badge>
                <ETACountdown createdAt={inv.created_at} status={inv.status} />
                <span className="text-xs text-black/40 font-[family-name:var(--font-mono)]">{String(inv.id).slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-black/40 shrink-0">
                <Clock className="size-3" />
                {inv.created_at ? formatRelativeTime(inv.created_at) : 'Unknown'}
              </div>
            </div>

            {/* Middle Row — Error Info */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {inv.method && inv.endpoint && (
                <Badge variant="secondary" className="font-[family-name:var(--font-mono)] text-[11px]">
                  {inv.method} {inv.endpoint}
                </Badge>
              )}
              {inv.status_code && (
                <Badge
                  variant="outline"
                  className={`text-[11px] font-[family-name:var(--font-mono)] ${
                    inv.status_code >= 500 ? 'bg-red-50 text-red-600 border-red-200' :
                    inv.status_code >= 400 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-orange-50 text-orange-600 border-orange-200'
                  }`}
                >
                  {inv.status_code}
                </Badge>
              )}
            </div>

            {inv.root_cause && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-sm text-black/70 mb-3 line-clamp-1">{inv.root_cause}</p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-md">
                    <p className="text-sm">{inv.root_cause}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {inv.affected_file && (
              <div className="flex items-center gap-1.5 text-xs text-black/50 mb-3">
                <FileCode className="size-3" />
                <span className="font-[family-name:var(--font-mono)]">{inv.affected_file}</span>
              </div>
            )}

            {/* Bottom Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-black/40">
                <div className="flex items-center gap-1.5">
                  <Cpu className="size-3" />
                  <span>Passes:</span>
                  <PassCircles passes={inv.status === 'completed' ? 4 : inv.status === 'in_progress' ? 2 : 0} />
                </div>
                <ModelsUsedPanel modelsUsed={modelsUsed} />
              </div>
              <div className="flex items-center gap-3">
                <ConfidenceArc confidence={inv.confidence || 0} />
                {inv.pr_url && (
                  <a
                    href={inv.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                  >
                    <GitPullRequest className="size-3" />
                    PR #{inv.pr_number || '?'}
                    <ExternalLink className="size-2.5" />
                  </a>
                )}
              </div>
            </div>

            <ChevronDown className={`size-4 text-black/30 mt-2 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator />
          <CardContent className="p-5 space-y-4">
            {/* Stack Trace */}
            {stackLines.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-black/50 mb-2">STACK TRACE</h4>
                <div className="bg-[#1a1a2e] rounded-lg p-3 overflow-x-auto">
                  <pre className="text-xs text-emerald-400/80 font-[family-name:var(--font-mono)] whitespace-pre-wrap">
                    {stackLines.join('\n')}
                  </pre>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {inv.patchDiff && (
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="size-3 mr-1" />
                  Download patch
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function InvestigationSkeleton({ index }: { index: number }) {
  return (
    <Card className="anim-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-8 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-3/4 mb-3" />
        <Skeleton className="h-3 w-1/2 mb-3" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="size-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function InvestigationsList({ investigations, loading, projectId }: { investigations: any[]; loading?: boolean; projectId?: string }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <InvestigationSkeleton key={i} index={i} />
        ))}
      </div>
    )
  }

  if (!investigations?.length) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto mb-4 size-16 text-black/10" viewBox="0 0 100 100" fill="none">
          <path d="M50 5 L58 35 L90 35 L64 55 L72 85 L50 65 L28 85 L36 55 L10 35 L42 35 Z" fill="currentColor" />
          <circle cx="50" cy="50" r="12" fill="white" />
          <circle cx="50" cy="50" r="8" fill="currentColor" />
        </svg>
        <h3 className="text-lg font-light text-black/60 mb-1">No investigations yet</h3>
        <p className="text-sm text-black/40 mb-4 max-w-sm mx-auto">
          Send your first error log and Snowflake will automatically analyze and fix it.
        </p>

      </div>
    )
  }

  return (
    <div className="space-y-3">
      {investigations.map((inv, i) => (
        <InvestigationCard key={inv.id} inv={inv} index={i} />
      ))}
    </div>
  )
}
