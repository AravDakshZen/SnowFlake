'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PixelIcon } from '@/components/pixel-icon'
import { DashboardLiveFeed } from '@/components/dashboard-live-feed'

export default function ActivityPage() {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string>()

  useEffect(() => {
    fetch('/api/project/current')
      .then(res => res.json())
      .then(data => {
        const id = data.project?.id as string | undefined
        setProjectId(id)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-xl">←</button>
            <PixelIcon type="platform" size={24} />
            <h1 className="text-xl font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
              Activity
            </h1>
          </div>
          <a
            href="/dashboard"
            className="px-4 py-2 text-xs tracking-widest font-light bg-black/5 hover:bg-black/10 rounded-lg transition-colors"
          >
            DASHBOARD
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-16">
        <DashboardLiveFeed projectId={projectId} />
      </main>
    </div>
  )
}