'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RevealText } from '@/components/reveal-text'
import { PixelIcon } from '@/components/pixel-icon'
import { toastError } from '@/lib/toasts'

export default function ClustersPage() {
  const router = useRouter()
  const [sortBy, setSortBy] = useState('recent')
  const [filterStatus, setFilterStatus] = useState('all')
  const [clusters, setClusters] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clusters')
      .then(res => res.json())
      .then(data => {
        setClusters(data)
        setIsLoading(false)
      })
      .catch(() => { setIsLoading(false); toastError('Could not load error clusters', 'Please try again in a moment.') })
  }, [])

  const filtered = clusters?.clusters?.filter((c: any) => {
    if (filterStatus === 'all') return true
    return c.status === filterStatus
  }) || []

  const sorted = [...filtered].sort((a: any, b: any) => {
    if (sortBy === 'recent') {
      return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
    }
    if (sortBy === 'events') {
      return b.event_count - a.event_count
    }
    return a.title.localeCompare(b.title)
  })

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-xl">←</button>
            <h1 className="text-xl font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
              Error Clusters
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-16">
        
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Filter */}
          <div className="flex gap-2">
            {['all', 'open', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs tracking-widest font-light rounded-lg transition-all ${
                  filterStatus === status
                    ? 'bg-black text-white'
                    : 'bg-black/5 text-black hover:bg-black/10'
                }`}
              >
                {status.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            {['recent', 'events', 'name'].map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-3 py-1 text-xs tracking-widest font-light rounded-lg transition-all ${
                  sortBy === sort
                    ? 'bg-black text-white'
                    : 'bg-black/5 text-black hover:bg-black/10'
                }`}
              >
                {sort === 'recent' ? 'RECENT' : sort === 'events' ? 'EVENTS' : 'NAME'}
              </button>
            ))}
          </div>
        </div>

        {/* Clusters List */}
        {isLoading ? (
          <div className="text-center py-16 text-black/40">Loading clusters...</div>
        ) : sorted.length ? (
          <div className="grid gap-4">
            {sorted.map((cluster: any) => (
              <div
                key={cluster.id}
                onClick={() => router.push(`/clusters/${cluster.id}`)}
                className="p-6 rounded-2xl border border-black/[0.07] bg-white hover:bg-[#fafaf8] cursor-pointer transition-all hover:border-black/[0.15] hover:shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-light mb-1">{cluster.title}</h3>
                    <p className="text-xs text-black/40">
                      {cluster.service} • {cluster.environment} • Level: {cluster.level}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-light whitespace-nowrap ml-4 ${
                    cluster.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {cluster.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-black/40">Events</span>
                    <div className="font-light mt-1">{cluster.event_count}</div>
                  </div>
                  <div>
                    <span className="text-black/40">First Seen</span>
                    <div className="font-light mt-1">{new Date(cluster.first_seen_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="text-black/40">Last Seen</span>
                    <div className="font-light mt-1">{new Date(cluster.last_seen_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <PixelIcon type="platform" size={40} />
            <p className="mt-4 text-black/40">No error clusters yet.</p>
          </div>
        )}
      </main>
    </div>
  )
}
