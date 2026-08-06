'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { RevealText } from '@/components/reveal-text'
import { PixelIcon } from '@/components/pixel-icon'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function InvestigationsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  
  const { data: investigations, isLoading } = useSWR('/api/investigations', fetcher)

  const filtered = investigations?.data?.filter((inv: any) => {
    if (filter === 'all') return true
    return inv.status === filter
  }) || []

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-xl">←</button>
            <h1 className="text-xl font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
              Investigations
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-16">
        
        {/* Filters */}
        <div className="flex gap-3 mb-8">
          {['all', 'in_progress', 'completed', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-xs tracking-widest font-light rounded-lg transition-all ${
                filter === status
                  ? 'bg-black text-white'
                  : 'bg-black/5 text-black hover:bg-black/10'
              }`}
            >
              {status === 'all' ? 'ALL' : status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Investigations List */}
        {isLoading ? (
          <div className="text-center py-16 text-black/40">Loading investigations...</div>
        ) : filtered.length ? (
          <div className="grid gap-4">
            {filtered.map((inv: any) => (
              <div
                key={inv.id}
                onClick={() => router.push(`/investigations/${inv.id}`)}
                className="p-6 rounded-2xl border border-black/[0.07] bg-white hover:bg-[#fafaf8] cursor-pointer transition-all hover:border-black/[0.15] hover:shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-light mb-2">{inv.question}</h3>
                    <p className="text-sm text-black/40 line-clamp-2">{inv.summary}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-light whitespace-nowrap ml-4 ${
                    inv.status === 'completed' ? 'bg-green-100 text-green-700' : 
                    inv.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {inv.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-black/40 mb-3">
                  <span>Attempt {inv.attempt} of 3</span>
                  <span>Confidence: {inv.confidence}%</span>
                </div>

                <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-black/20 rounded-full transition-all"
                    style={{ width: `${inv.confidence}%` }}
                  />
                </div>

                {inv.pr_url && (
                  <div className="mt-3 text-xs">
                    <a 
                      href={inv.pr_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View PR #{inv.pr_number}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <PixelIcon type="platform" size={40} />
            <p className="mt-4 text-black/40">No {filter !== 'all' ? filter : ''} investigations yet.</p>
          </div>
        )}
      </main>
    </div>
  )
}
