'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toastSuccess, toastError, toastLoading, dismissToast } from '@/lib/toasts'

export default function ClusterDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [cluster, setCluster] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetch(`/api/clusters?id=${id}`)
        .then(res => res.json())
        .then(data => {
          setCluster(data)
          setIsLoading(false)
        })
        .catch(() => setIsLoading(false))
    }
  }, [id])

  const clusterData = cluster?.data?.[0]

  if (isLoading) {
    return (
      <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased flex items-center justify-center">
        <div className="text-black/40">Loading cluster...</div>
      </div>
    )
  }

  if (!clusterData) {
    return (
      <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased flex items-center justify-center">
        <div className="text-center">
          <p className="text-black/40 mb-4">Cluster not found</p>
          <button
            onClick={() => router.back()}
            className="text-xs tracking-widest bg-black text-white px-4 py-2 rounded-lg"
          >
            GO BACK
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-2xl">←</button>
          <span className={`text-xs px-3 py-1 rounded-full font-light ${
            clusterData.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {clusterData.status.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 md:px-12 py-16">
        
        {/* Title */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
            {clusterData.title}
          </h1>
          <p className="text-sm text-black/40">
            {clusterData.service} • {clusterData.environment}
          </p>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Total Events', value: clusterData.event_count },
            { label: 'Level', value: clusterData.level.toUpperCase() },
            { label: 'First Seen', value: new Date(clusterData.first_seen_at).toLocaleDateString() },
            { label: 'Last Seen', value: new Date(clusterData.last_seen_at).toLocaleDateString() },
          ].map((metric) => (
            <div key={metric.label} className="p-4 rounded-xl border border-black/[0.07] bg-white">
              <div className="text-xs text-black/40 tracking-widest uppercase mb-2">{metric.label}</div>
              <div className="text-lg font-light">{metric.value}</div>
            </div>
          ))}
        </section>

        {/* Fingerprint */}
        <section className="mb-12">
          <h2 className="text-xl font-light tracking-tight mb-4">Fingerprint</h2>
          <div className="p-4 rounded-xl border border-black/[0.07] bg-white font-mono text-xs break-all">
            {clusterData.fingerprint}
          </div>
        </section>

        {/* Investigation Trigger */}
        <section>
          <button
            onClick={async () => {
              const loadingId = toastLoading('Starting investigation…', 'Queuing the analysis pipeline.')
              try {
                const response = await fetch('/api/investigations', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    cluster_id: id,
                    question: `Investigate ${clusterData.title}`,
                  })
                })
                const data = await response.json().catch(() => ({}))
                if (!response.ok) throw new Error(data.error || 'Unable to start investigation')
                dismissToast(loadingId)
                toastSuccess('Investigation started', `Analysis of "${clusterData.title}" is now running.`)
                router.push('/investigations')
              } catch (error) {
                dismissToast(loadingId)
                toastError('Could not start investigation', error instanceof Error ? error.message : 'Please try again.')
              }
            }}
            className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors"
          >
            START INVESTIGATION
          </button>
        </section>
      </main>
    </div>
  )
}
