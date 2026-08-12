'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Clock, Activity, ExternalLink, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { SeverityBadge } from '@/components/ui/SeverityBadge'

const SparklineChart = dynamic(() => import('./SparklineChart').then(m => m.SparklineChart), { ssr: false, loading: () => <div className="h-10 bg-black/5 rounded animate-pulse" /> })

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

function getSeverityType(severity: string): 'critical' | 'high' | 'medium' | 'low' {
  switch (severity) {
    case 'P0': return 'critical'
    case 'P1': return 'high'
    case 'P2': return 'medium'
    default: return 'low'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'open': return 'bg-red-100 text-red-700 border-red-200'
    case 'investigating': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'resolved': return 'bg-green-100 text-green-700 border-green-200'
    case 'escalated': return 'bg-purple-100 text-purple-700 border-purple-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function getSparklineColor(severity: string): string {
  switch (severity) {
    case 'P0': return '#ef4444'
    case 'P1': return '#f59e0b'
    case 'P2': return '#3b82f6'
    default: return '#6b7280'
  }
}

function getTrend(cluster: any): { label: string; color: string; icon: React.ReactNode } {
  const trend = Array.isArray(cluster.trend) ? cluster.trend : []
  if (trend.length < 6) return { label: 'Stable', color: 'bg-gray-100 text-gray-600', icon: <Minus className="size-3" /> }
  const first3 = trend.slice(0, 3).reduce((a: number, b: number) => a + (b || 0), 0)
  const last3 = trend.slice(-3).reduce((a: number, b: number) => a + (b || 0), 0)
  if (last3 > first3 * 1.2) return { label: 'Rising', color: 'bg-red-100 text-red-600', icon: <ArrowUpRight className="size-3" /> }
  if (last3 < first3 * 0.8) return { label: 'Resolving', color: 'bg-green-100 text-green-600', icon: <ArrowDownRight className="size-3" /> }
  return { label: 'Stable', color: 'bg-gray-100 text-gray-600', icon: <Minus className="size-3" /> }
}

function ClusterCard({ cluster, index, onInvestigate, onViewLogs }: { cluster: any; index: number; onInvestigate?: (id: string) => void; onViewLogs: (cluster: any) => void }) {
  const trend = getTrend(cluster)
  const trendData = Array.isArray(cluster.trend) ? cluster.trend : []

  return (
    <Card
      className={`anim-fade-up hover:border-black/15 hover:shadow-sm transition-all ${cluster.status === 'resolved' ? 'opacity-70' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-[family-name:var(--font-mono)] text-black/60">
              Cluster #{String(cluster.id).slice(0, 6)}
            </span>
            <SeverityBadge severity={getSeverityType(cluster.severity)} />
            <Badge variant="outline" className={getStatusColor(cluster.status)}>
              {cluster.status?.charAt(0).toUpperCase() + cluster.status?.slice(1)}
            </Badge>
          </div>
          <div className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${trend.color}`}>
            {trend.icon}
            {trend.label}
          </div>
        </div>

        {/* Pattern Info */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-xs text-black/50">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3" />
            <span>First: {cluster.first_seen_at ? new Date(cluster.first_seen_at).toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3" />
            <span>Last: {cluster.last_seen_at ? formatRelativeTime(cluster.last_seen_at) : '—'}</span>
          </div>
        </div>

        {cluster.title && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-[#1a1a2e] rounded-lg px-3 py-2 mb-3">
                  <p className="text-xs text-emerald-400/80 font-[family-name:var(--font-mono)] line-clamp-2">
                    {cluster.title}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
                <p className="text-sm font-[family-name:var(--font-mono)]">{cluster.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Sparkline */}
        <div className="mb-3">
          <SparklineChart data={trendData} color={getSparklineColor(cluster.severity)} />
        </div>

        {/* Bottom Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-black/40">
            <span className="flex items-center gap-1.5 font-medium text-lg text-black/70">
              <Activity className="size-4" />
              {cluster.event_count}
            </span>
            <span>{cluster.event_count} occurrence{cluster.event_count !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => onViewLogs(cluster)}>
              View all {cluster.event_count} logs
            </Button>
            {cluster.status === 'open' && onInvestigate && (
              <Button variant="default" size="sm" className="text-xs bg-[#29B5E8] hover:bg-[#29B5E8]/90" onClick={() => onInvestigate(cluster.id)}>
                Investigate now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ClusterSkeleton({ index }: { index: number }) {
  return (
    <Card className="anim-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg mb-3" />
        <Skeleton className="h-10 w-full rounded" />
        <div className="flex items-center justify-between mt-3">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ErrorClusters({ clusters, loading, projectId, onInvestigate }: { clusters: any[]; loading?: boolean; projectId?: string; onInvestigate?: (clusterId: string) => void }) {
  const [drawerCluster, setDrawerCluster] = useState<any>(null)
  const [drawerPage, setDrawerPage] = useState(1)
  const perPage = 10

  const drawerLogs = useMemo(() => {
    if (!drawerCluster) return []
    return Array.from({ length: drawerCluster.event_count || 0 }, (_, i) => ({
      id: `log-${i}`,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      endpoint: drawerCluster.title?.split(' ')[0] || '/api/unknown',
      method: 'POST',
      status: 500,
      stackTrace: drawerCluster.title || 'No stack trace available',
    }))
  }, [drawerCluster])

  const paginatedLogs = drawerLogs.slice((drawerPage - 1) * perPage, drawerPage * perPage)
  const totalPages = Math.ceil(drawerLogs.length / perPage)

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ClusterSkeleton key={i} index={i} />
        ))}
      </div>
    )
  }

  if (!clusters?.length) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto mb-4 size-16 text-black/10" viewBox="0 0 100 100" fill="none">
          <path d="M50 5 L58 35 L90 35 L64 55 L72 85 L50 65 L28 85 L36 55 L10 35 L42 35 Z" fill="currentColor" />
          <circle cx="50" cy="50" r="12" fill="white" />
          <circle cx="50" cy="50" r="8" fill="currentColor" />
        </svg>
        <h3 className="text-lg font-light text-black/60 mb-1">No error clusters yet</h3>
        <p className="text-sm text-black/40 max-w-sm mx-auto">
          Errors are automatically grouped by pattern when they share similar stack traces.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {clusters.slice(0, 5).map((cluster, i) => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            index={i}
            onInvestigate={onInvestigate}
            onViewLogs={setDrawerCluster}
          />
        ))}
      </div>

      {/* Log Drawer */}
      <Sheet open={!!drawerCluster} onOpenChange={() => { setDrawerCluster(null); setDrawerPage(1) }}>
        <SheetContent className="w-[600px] sm:w-[600px]">
          <SheetHeader>
            <SheetTitle className="font-[family-name:var(--font-mono)]">
              Cluster #{String(drawerCluster?.id ?? '').slice(0, 6)} — Logs
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-[family-name:var(--font-mono)]">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="secondary" className="font-[family-name:var(--font-mono)] text-[10px]">
                        {log.method} {log.endpoint}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px]">
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-black/50 max-w-[200px] truncate">
                      {log.stackTrace}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-black/40">
                  Page {drawerPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={drawerPage === 1}
                    onClick={() => setDrawerPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={drawerPage === totalPages}
                    onClick={() => setDrawerPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
