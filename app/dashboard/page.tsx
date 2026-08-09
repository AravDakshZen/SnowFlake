'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { RevealText } from '@/components/reveal-text'
import { PixelIcon } from '@/components/pixel-icon'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toastError } from '@/lib/toasts'
import {
  BarChart3,
  Search,
  Microscope,
  CheckCircle2,
  GitPullRequest,
  ArrowRight,
  Activity,
} from 'lucide-react'

const TerminalFeed = dynamic(() => import('@/components/dashboard/TerminalFeed').then(m => m.TerminalFeed), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-black/10 overflow-hidden bg-[#1a1a2e]">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#12121f] border-b border-white/5">
        <span className="size-3 rounded-full bg-[#FF5F57]" />
        <span className="size-3 rounded-full bg-[#FFBD2E]" />
        <span className="size-3 rounded-full bg-[#28C840]" />
      </div>
      <div className="h-72 p-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-3 bg-white/5 rounded" style={{ width: `${60 + i * 10}%` }} />
        ))}
      </div>
    </div>
  ),
})

const InvestigationsList = dynamic(() => import('@/components/dashboard/InvestigationsList').then(m => m.InvestigationsList), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 bg-black/5 rounded-xl" />
      ))}
    </div>
  ),
})

const ErrorClusters = dynamic(() => import('@/components/dashboard/ErrorClusters').then(m => m.ErrorClusters), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 bg-black/5 rounded-xl" />
      ))}
    </div>
  ),
})

const STAT_ICONS = {
  totalLogs: BarChart3,
  activeClusters: Search,
  totalInvestigations: Microscope,
  resolvedIssues: CheckCircle2,
}

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [clusters, setClusters] = useState<any>(null)
  const [investigations, setInvestigations] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [clustersLoading, setClustersLoading] = useState(true)
  const [investigationsLoading, setInvestigationsLoading] = useState(true)
  const [projectId, setProjectId] = useState<string>()

  useEffect(() => {
    setMounted(true)
    document.title = 'Snowflake — Dashboard'

    fetch('/api/project/current')
      .then(res => res.json())
      .then(data => {
        const id = data.project?.id as string | undefined
        setProjectId(id)
        if (!id) {
          setStatsLoading(false)
          setClustersLoading(false)
          setInvestigationsLoading(false)
          return
        }
        const query = `?projectId=${encodeURIComponent(id)}`
        Promise.allSettled([
          fetch(`/api/stats${query}`).then(r => r.json()),
          fetch(`/api/clusters${query}`).then(r => r.json()),
          fetch(`/api/investigations${query}`).then(r => r.json()),
        ]).then(([statsResult, clustersResult, invResult]) => {
          if (statsResult.status === 'fulfilled') setStats(statsResult.value)
          if (clustersResult.status === 'fulfilled') setClusters(clustersResult.value)
          if (invResult.status === 'fulfilled') setInvestigations(invResult.value)
        }).finally(() => {
          setStatsLoading(false)
          setClustersLoading(false)
          setInvestigationsLoading(false)
        })
      })
      .catch(() => {
        setStatsLoading(false)
        setClustersLoading(false)
        setInvestigationsLoading(false)
        toastError('Dashboard could not load', 'Please check your connection and try again.')
      })
  }, [])

  const handleInvestigate = async (clusterId: string) => {
    if (!projectId) return
    try {
      const res = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: clusterId }),
      })
      if (res.ok) {
        toastError('Investigation queued', 'The investigation will start shortly.')
      }
    } catch {}
  }

  if (!mounted) return null

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="size-6" viewBox="0 0 100 100" fill="none">
              <path d="M50 5 L58 35 L90 35 L64 55 L72 85 L50 65 L28 85 L36 55 L10 35 L42 35 Z" fill="#29B5E8" />
              <circle cx="50" cy="50" r="12" fill="white" />
              <circle cx="50" cy="50" r="8" fill="#29B5E8" />
            </svg>
            <h1 className="text-xl font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
              Snowflake — Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="px-4 py-2 text-xs tracking-widest font-light bg-black/5 hover:bg-black/10 rounded-lg transition-colors">
              HOME
            </a>
            <a href="/settings" className="px-4 py-2 text-xs tracking-widest font-light bg-black/5 hover:bg-black/10 rounded-lg transition-colors">
              SETTINGS
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-16">
        {/* Stats Grid */}
        <section className="mb-16">
          <RevealText className="text-3xl md:text-4xl font-light tracking-tight mb-8">
            System Overview
          </RevealText>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="anim-fade-up" style={{ animationDelay: `${i * 75}ms` }}>
                  <CardContent className="p-6">
                    <Skeleton className="size-8 rounded-md mb-4" />
                    <Skeleton className="h-3 w-20 mb-3" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              [
                { key: 'totalLogs', label: 'Total Logs', value: stats?.totalLogs || 0 },
                { key: 'activeClusters', label: 'Active Clusters', value: stats?.activeClusters || 0 },
                { key: 'totalInvestigations', label: 'Investigations', value: stats?.totalInvestigations || 0 },
                { key: 'resolvedIssues', label: 'Resolved Issues', value: stats?.resolvedIssues || 0 },
              ].map((stat, i) => {
                const Icon = STAT_ICONS[stat.key as keyof typeof STAT_ICONS]
                return (
                  <Card key={stat.label} className="anim-fade-up hover:bg-[#fafaf8] transition-all duration-500 hover:border-black/[0.15]" style={{ animationDelay: `${i * 75}ms` }}>
                    <CardContent className="p-6">
                      <Icon className="size-6 text-black/40 mb-3" strokeWidth={1.5} />
                      <div className="text-sm text-black/40 tracking-widest uppercase mb-1">{stat.label}</div>
                      <div className="text-3xl font-light" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
                        {stat.value.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </section>

        {/* Error Clusters */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <RevealText className="text-3xl md:text-4xl font-light tracking-tight">
              Snowflake — Clusters
            </RevealText>
            <a href="/clusters" className="flex items-center gap-1 text-xs tracking-widest text-black/40 hover:text-black transition-colors">
              VIEW ALL <ArrowRight className="size-3" />
            </a>
          </div>
          <ErrorClusters
            clusters={clusters?.clusters || []}
            loading={clustersLoading}
            projectId={projectId}
            onInvestigate={handleInvestigate}
          />
        </section>

        {/* Live Activity Terminal */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <RevealText className="text-3xl md:text-4xl font-light tracking-tight">
              Snowflake — Live Activity
            </RevealText>
            <a href="/activity" className="flex items-center gap-1 text-xs tracking-widest text-black/40 hover:text-black transition-colors">
              VIEW ALL <ArrowRight className="size-3" />
            </a>
          </div>
          <TerminalFeed projectId={projectId} limit={50} />
        </section>

        {/* Recent Investigations */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <RevealText className="text-3xl md:text-4xl font-light tracking-tight">
              Snowflake — Investigations
            </RevealText>
            <a href="/investigations" className="flex items-center gap-1 text-xs tracking-widest text-black/40 hover:text-black transition-colors">
              VIEW ALL <ArrowRight className="size-3" />
            </a>
          </div>
          <InvestigationsList
            investigations={investigations?.investigations || []}
            loading={investigationsLoading}
            projectId={projectId}
          />
        </section>
      </main>
    </div>
  )
}
