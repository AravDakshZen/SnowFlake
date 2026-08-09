'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RevealText } from '@/components/reveal-text'
import { PixelIcon } from '@/components/pixel-icon'
import { DashboardLiveFeed } from '@/components/dashboard-live-feed'
import { toastError } from '@/lib/toasts'
import {
  BarChart3,
  Search,
  Microscope,
  CheckCircle2,
  AlertTriangle,
  GitPullRequest,
  Clock,
  ChevronRight,
  Activity,
  ArrowRight,
  XCircle,
  Loader2,
} from 'lucide-react'

const STAT_ICONS = {
  totalLogs: BarChart3,
  activeClusters: Search,
  totalInvestigations: Microscope,
  resolvedIssues: CheckCircle2,
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  resolved: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  queued: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
}

const STRATEGY_LABELS: Record<string, string> = {
  one_liner: 'One-liner fix',
  'one-liner': 'One-liner fix',
  refactor: 'Refactor',
  dependency_update: 'Dependency update',
  'dependency-update': 'Dependency update',
  config_change: 'Config change',
  'config-change': 'Config change',
}

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

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [clusters, setClusters] = useState<any>(null)
  const [investigations, setInvestigations] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [clustersLoading, setClustersLoading] = useState(true)
  const [investigationsLoading, setInvestigationsLoading] = useState(true)
  const [githubLoading, setGithubLoading] = useState(true)
  const [projectId, setProjectId] = useState<string>()
  const [githubProfile, setGithubProfile] = useState<any>(null)
  const [githubRepos, setGithubRepos] = useState<any>(null)

  useEffect(() => {
    setMounted(true)

    fetch('/api/project/current')
      .then(res => res.json())
      .then(data => {
        const id = data.project?.id as string | undefined
        setProjectId(id)
        if (!id) { setGithubLoading(false); return }
        const query = `?projectId=${encodeURIComponent(id)}`

        // All fetches in parallel — each resolves independently
        Promise.allSettled([
          fetch(`/api/github/profile${query}`).then(res => res.json()),
          fetch(`/api/github/repos${query}`).then(res => res.json()),
          fetch(`/api/stats${query}`).then(res => res.json()),
          fetch(`/api/clusters${query}`).then(res => res.json()),
          fetch(`/api/investigations${query}`).then(res => res.json()),
        ]).then(([profileResult, reposResult, statsResult, clustersResult, invResult]) => {
          if (profileResult.status === 'fulfilled' && profileResult.value?.profile) setGithubProfile(profileResult.value.profile)
          if (reposResult.status === 'fulfilled' && reposResult.value?.repos) setGithubRepos(reposResult.value.repos)
          if (statsResult.status === 'fulfilled') setStats(statsResult.value)
          if (clustersResult.status === 'fulfilled') setClusters(clustersResult.value)
          if (invResult.status === 'fulfilled') setInvestigations(invResult.value)
        }).finally(() => {
          setGithubLoading(false)
          setStatsLoading(false)
          setClustersLoading(false)
          setInvestigationsLoading(false)
        })
      })
      .catch(() => {
        setGithubLoading(false)
        setStatsLoading(false)
        setClustersLoading(false)
        setInvestigationsLoading(false)
        toastError('Dashboard could not load', 'Please check your connection and try again.')
      })
  }, [])

  if (!mounted) return null

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PixelIcon type="platform" size={24} />
            <h1 className="text-xl font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
              Snowflake Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="px-4 py-2 text-xs tracking-widest font-light bg-black/5 hover:bg-black/10 rounded-lg transition-colors"
            >
              HOME
            </a>
            <a
              href="/settings"
              className="px-4 py-2 text-xs tracking-widest font-light bg-black/5 hover:bg-black/10 rounded-lg transition-colors"
            >
              SETTINGS
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-16">

        {/* Stats Grid */}
        <section className="mb-16">
          <RevealText className="text-3xl md:text-4xl font-light tracking-tight mb-8">
            System Overview
          </RevealText>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-6 rounded-2xl border border-black/[0.07] bg-white">
                  <div className="size-8 rounded-md bg-black/5 animate-pulse mb-4" style={{ animationDelay: `${i * 75}ms` }} />
                  <div className="h-3 w-20 bg-black/5 animate-pulse mb-3" style={{ animationDelay: `${i * 75 + 50}ms` }} />
                  <div className="h-8 w-16 bg-black/10 animate-pulse" style={{ animationDelay: `${i * 75 + 100}ms` }} />
                </div>
              ))
            ) : (
              [
                { key: 'totalLogs', label: 'Total Logs', value: stats?.totalLogs || 0 },
                { key: 'activeClusters', label: 'Active Clusters', value: stats?.activeClusters || 0 },
                { key: 'totalInvestigations', label: 'Investigations', value: stats?.totalInvestigations || 0 },
                { key: 'resolvedIssues', label: 'Resolved Issues', value: stats?.resolvedIssues || 0 },
              ].map((stat) => {
                const Icon = STAT_ICONS[stat.key as keyof typeof STAT_ICONS]
                return (
                  <div
                    key={stat.label}
                    className="p-6 rounded-2xl border border-black/[0.07] bg-white hover:bg-[#fafaf8] transition-all duration-500 hover:border-black/[0.15]"
                  >
                    <Icon className="size-6 text-black/40 mb-3" strokeWidth={1.5} />
                    <div className="text-sm text-black/40 tracking-widest uppercase mb-1">{stat.label}</div>
                    <div className="text-3xl font-light" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
                      {stat.value.toLocaleString()}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* GitHub Integration */}
        <section className="mb-16">
          <RevealText className="text-3xl md:text-4xl font-light tracking-tight mb-8">
            GitHub Integration
          </RevealText>

          <div className="p-6 rounded-2xl border border-black/[0.07] bg-white">
            {githubLoading ? (
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-black/5 animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-40 bg-black/10 animate-pulse" />
                  <div className="h-3 w-24 bg-black/5 animate-pulse" />
                  <div className="h-3 w-64 bg-black/5 animate-pulse" />
                </div>
              </div>
            ) : githubProfile ? (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  {githubProfile.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={githubProfile.avatarUrl} alt={githubProfile.login} className="size-12 rounded-full" />
                  )}
                  <div>
                    <div className="text-lg font-light">{githubProfile.name || githubProfile.login}</div>
                    <div className="text-xs text-black/40">@{githubProfile.login}</div>
                  </div>
                  {githubProfile.htmlUrl && (
                    <a href={githubProfile.htmlUrl} target="_blank" rel="noreferrer" className="ml-auto text-xs tracking-widest text-black/40 hover:text-black transition-colors">
                      VIEW PROFILE →
                    </a>
                  )}
                </div>
                {githubProfile.bio && <p className="text-sm text-black/60 mb-4">{githubProfile.bio}</p>}
                {githubRepos?.length ? (
                  <div>
                    <div className="text-xs text-black/40 tracking-widest uppercase mb-3">CONNECTED REPOSITORIES</div>
                    <div className="flex flex-wrap gap-2">
                      {githubRepos.slice(0, 6).map((repo: any) => (
                        <span key={`${repo.owner}/${repo.name}`} className="px-3 py-1.5 rounded-lg bg-black/5 text-xs font-mono">
                          {repo.owner}/{repo.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-black/60 mb-2">Connect your GitHub account to enable automatic PR creation and CI integration.</p>
                  <p className="text-xs text-black/40">Your profile and repositories will appear here once connected.</p>
                </div>
                <a
                  href="/settings"
                  className="flex-shrink-0 px-4 py-2 text-xs tracking-widest font-light bg-black/5 hover:bg-black/10 rounded-lg transition-colors"
                >
                  CONNECT GITHUB →
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Error Clusters */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <RevealText className="text-3xl md:text-4xl font-light tracking-tight">
              Error Clusters
            </RevealText>
            <a
              href="/clusters"
              className="flex items-center gap-1 text-xs tracking-widest text-black/40 hover:text-black transition-colors"
            >
              VIEW ALL <ArrowRight className="size-3" />
            </a>
          </div>

          {clustersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-5 rounded-xl border border-black/[0.07] bg-white" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 bg-black/10 animate-pulse" />
                      <div className="h-3 w-1/3 bg-black/5 animate-pulse" />
                    </div>
                    <div className="h-5 w-16 rounded-full bg-black/5 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-3 bg-black/5 animate-pulse rounded" style={{ animationDelay: `${i * 100 + j * 50}ms` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : clusters?.clusters?.length ? (
            <div className="space-y-3">
              {clusters.clusters.slice(0, 5).map((cluster: any) => (
                <div
                  key={cluster.id}
                  onClick={() => router.push(`/clusters/${cluster.id}`)}
                  className="group p-5 rounded-xl border border-black/[0.07] bg-white hover:bg-[#fafaf8] cursor-pointer transition-all hover:border-black/[0.15] hover:shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-black/30 shrink-0" />
                        <h3 className="font-light text-sm truncate">{cluster.title}</h3>
                      </div>
                      <p className="text-xs text-black/40 mt-1 ml-6">
                        {cluster.service} · {cluster.environment} · Level: {cluster.level || 'unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-light tracking-wider uppercase ${STATUS_COLORS[cluster.status] ?? 'bg-black/5 text-black/50'}`}>
                        {cluster.status}
                      </span>
                      <ChevronRight className="size-4 text-black/20 group-hover:text-black/40 transition-colors" />
                    </div>
                  </div>

                  {cluster.status === 'open' && cluster.latest_error && (
                    <div className="mb-3 ml-6 text-xs text-red-600/80 font-mono line-clamp-2 bg-red-50/50 rounded-lg px-3 py-2">
                      {cluster.latest_error}
                    </div>
                  )}

                  <div className="flex items-center gap-6 ml-6 text-xs text-black/40">
                    <span className="flex items-center gap-1.5">
                      <Activity className="size-3" />
                      {cluster.event_count} event{cluster.event_count !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3" />
                      First: {new Date(cluster.first_seen_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3" />
                      Last: {formatRelativeTime(cluster.last_seen_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-black/40">No error clusters yet. Send your first log!</div>
          )}
        </section>

        {/* Live Activity */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <RevealText className="text-3xl md:text-4xl font-light tracking-tight">
              Live Activity
            </RevealText>
            <a
              href="/activity"
              className="flex items-center gap-1 text-xs tracking-widest text-black/40 hover:text-black transition-colors"
            >
              VIEW ALL <ArrowRight className="size-3" />
            </a>
          </div>
          <DashboardLiveFeed projectId={projectId} limit={6} viewAll="/activity" />
        </section>

        {/* Recent Investigations */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <RevealText className="text-3xl md:text-4xl font-light tracking-tight">
              Recent Investigations
            </RevealText>
            <a
              href="/investigations"
              className="flex items-center gap-1 text-xs tracking-widest text-black/40 hover:text-black transition-colors"
            >
              VIEW ALL <ArrowRight className="size-3" />
            </a>
          </div>

          {investigationsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-5 rounded-xl border border-black/[0.07] bg-white" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 bg-black/10 animate-pulse" />
                      <div className="h-3 w-1/3 bg-black/5 animate-pulse" />
                    </div>
                    <div className="h-5 w-20 rounded-full bg-black/5 animate-pulse" />
                  </div>
                  <div className="h-3 w-full bg-black/5 animate-pulse rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-black/10 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : investigations?.investigations?.length ? (
            <div className="space-y-3">
              {investigations.investigations.slice(0, 5).map((inv: any) => (
                <div
                  key={inv.id}
                  onClick={() => router.push(`/investigations/${inv.id}`)}
                  className="group p-5 rounded-xl border border-black/[0.07] bg-white hover:bg-[#fafaf8] cursor-pointer transition-all hover:border-black/[0.15] hover:shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Microscope className="size-4 text-black/30 shrink-0" />
                        <h3 className="font-light text-sm truncate">{inv.question}</h3>
                      </div>
                      {inv.summary && (
                        <p className="text-xs text-black/40 mt-1 ml-6 line-clamp-2">{inv.summary}</p>
                      )}
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-light tracking-wider uppercase shrink-0 ml-4 ${STATUS_COLORS[inv.status] ?? 'bg-black/5 text-black/50'}`}>
                      {inv.status?.replace('_', ' ')}
                    </span>
                  </div>

                  {inv.status === 'failed' && inv.root_cause && (
                    <div className="mb-3 ml-6 text-xs text-red-600/80 font-mono line-clamp-2 bg-red-50/50 rounded-lg px-3 py-2">
                      {inv.root_cause}
                    </div>
                  )}

                  {inv.fix_strategy && (
                    <div className="mb-3 ml-6">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/5 text-black/50 tracking-wider uppercase">
                        {STRATEGY_LABELS[inv.fix_strategy] ?? inv.fix_strategy}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between ml-6">
                    <div className="flex items-center gap-4 text-xs text-black/40">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3" />
                        {inv.created_at ? formatRelativeTime(inv.created_at) : 'Unknown'}
                      </span>
                      <span>Attempt {inv.attempt || 1} of 3</span>
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="size-3" />
                        {inv.confidence}% confidence
                      </span>
                    </div>
                    {inv.pr_url && (
                      <a
                        href={inv.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                      >
                        <GitPullRequest className="size-3" />
                        PR #{inv.pr_number || '?'}
                      </a>
                    )}
                  </div>

                  {/* Confidence bar */}
                  <div className="mt-3 ml-6 w-full h-1 bg-black/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black/20 rounded-full transition-all"
                      style={{ width: `${inv.confidence || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-black/40">No investigations yet.</div>
          )}
        </section>
      </main>
    </div>
  )
}
