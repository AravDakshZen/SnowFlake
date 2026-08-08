'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RevealText } from '@/components/reveal-text'
import { PixelIcon } from '@/components/pixel-icon'
import { DashboardLiveFeed } from '@/components/dashboard-live-feed'
import { toastError } from '@/lib/toasts'

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
  const [githubProfile, setGithubProfile] = useState<any>(null)
  const [githubRepos, setGithubRepos] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    
    fetch('/api/project/current')
      .then(res => res.json())
      .then(data => {
        const id = data.project?.id as string | undefined
        setProjectId(id)
        if (!id) return
        const query = `?projectId=${encodeURIComponent(id)}`
        fetch(`/api/github/profile${query}`).then(res => res.json()).then(d => { if (d.profile) setGithubProfile(d.profile) }).catch(() => {})
        fetch(`/api/github/repos${query}`).then(res => res.json()).then(d => { if (d.repos) setGithubRepos(d.repos) }).catch(() => {})
        Promise.all([
          fetch(`/api/stats${query}`).then(res => res.json()),
          fetch(`/api/clusters${query}`).then(res => res.json()),
          fetch(`/api/investigations${query}`).then(res => res.json()),
        ]).then(([nextStats, nextClusters, nextInvestigations]) => {
          setStats(nextStats)
          setClusters(nextClusters)
          setInvestigations(nextInvestigations)
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
            {[
              { label: 'Total Logs', value: stats?.totalLogs || 0, icon: '📊' },
              { label: 'Active Clusters', value: stats?.activeClusters || 0, icon: '🔍' },
              { label: 'Investigations', value: stats?.totalInvestigations || 0, icon: '🔬' },
              { label: 'Resolved Issues', value: stats?.resolvedIssues || 0, icon: '✅' },
            ].map((stat) => (
              <div 
                key={stat.label}
                className="p-6 rounded-2xl border border-black/[0.07] bg-white hover:bg-[#fafaf8] transition-all duration-500 hover:border-black/[0.15]"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-sm text-black/40 tracking-widest uppercase mb-1">{stat.label}</div>
                <div className="text-3xl font-light" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
                  {stat.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* GitHub Integration */}
        <section className="mb-16">
          <RevealText className="text-3xl md:text-4xl font-light tracking-tight mb-8">
            GitHub Integration
          </RevealText>
          
          <div className="p-6 rounded-2xl border border-black/[0.07] bg-white">
            {githubProfile ? (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  {githubProfile.avatarUrl && (
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
              className="text-xs tracking-widest text-black/40 hover:text-black transition-colors"
            >
              VIEW ALL →
            </a>
          </div>
          
          {clustersLoading ? (
            <div className="text-center py-8 text-black/40">Loading clusters...</div>
          ) : clusters?.clusters?.length ? (
            <div className="space-y-3">
              {clusters.clusters.slice(0, 5).map((cluster: any) => (
                <div
                  key={cluster.id}
                  onClick={() => router.push(`/clusters/${cluster.id}`)}
                  className="p-4 rounded-xl border border-black/[0.07] bg-white hover:bg-[#fafaf8] cursor-pointer transition-all hover:border-black/[0.15]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-light text-sm truncate">{cluster.title}</h3>
                      <p className="text-xs text-black/40 mt-1">{cluster.service} • {cluster.environment}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-light ${
                      cluster.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {cluster.status}
                    </span>
                  </div>
                  <div className="text-xs text-black/30">{cluster.event_count} events • Last seen {new Date(cluster.last_seen_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-black/40">No error clusters yet. Send your first log!</div>
          )}
        </section>

        <DashboardLiveFeed projectId={projectId} />

        {/* Recent Investigations */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <RevealText className="text-3xl md:text-4xl font-light tracking-tight">
              Recent Investigations
            </RevealText>
            <a 
              href="/investigations" 
              className="text-xs tracking-widest text-black/40 hover:text-black transition-colors"
            >
              VIEW ALL →
            </a>
          </div>
          
          {investigationsLoading ? (
            <div className="text-center py-8 text-black/40">Loading investigations...</div>
          ) : investigations?.investigations?.length ? (
            <div className="space-y-3">
              {investigations.investigations.slice(0, 5).map((inv: any) => (
                <div
                  key={inv.id}
                  onClick={() => router.push(`/investigations/${inv.id}`)}
                  className="p-4 rounded-xl border border-black/[0.07] bg-white hover:bg-[#fafaf8] cursor-pointer transition-all hover:border-black/[0.15]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-light text-sm">{inv.question}</h3>
                      <p className="text-xs text-black/40 mt-1">Confidence: {inv.confidence}%</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-light ${
                      inv.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      inv.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {inv.status}
                    </span>
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
