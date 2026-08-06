'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RevealText } from '@/components/reveal-text'

export default function InvestigationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [investigation, setInvestigation] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetch(`/api/investigations/${id}`)
        .then(res => res.json())
        .then(data => {
          setInvestigation(data)
          setIsLoading(false)
        })
        .catch(() => setIsLoading(false))
    }
  }, [id])

  if (isLoading) {
    return (
      <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased flex items-center justify-center">
        <div className="text-black/40">Loading investigation...</div>
      </div>
    )
  }

  if (!investigation?.data) {
    return (
      <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased flex items-center justify-center">
        <div className="text-center">
          <p className="text-black/40 mb-4">Investigation not found</p>
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

  const inv = investigation.data

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-2xl">←</button>
          <span className={`text-xs px-3 py-1 rounded-full font-light ${
            inv.status === 'completed' ? 'bg-green-100 text-green-700' : 
            inv.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 
            'bg-gray-100 text-gray-700'
          }`}>
            {inv.status.replace('_', ' ')}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 md:px-12 py-16">
        
        {/* Question */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
            {inv.question}
          </h1>
        </section>

        {/* Metrics */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Confidence', value: `${inv.confidence}%` },
            { label: 'Attempt', value: `${inv.attempt}/3` },
            { label: 'Status', value: inv.status.replace('_', ' ') },
            { label: 'Created', value: new Date(inv.created_at).toLocaleDateString() },
          ].map((metric) => (
            <div key={metric.label} className="p-4 rounded-xl border border-black/[0.07] bg-white">
              <div className="text-xs text-black/40 tracking-widest uppercase mb-2">{metric.label}</div>
              <div className="text-lg font-light">{metric.value}</div>
            </div>
          ))}
        </section>

        {/* Summary */}
        {inv.summary && (
          <section className="mb-12">
            <h2 className="text-xl font-light tracking-tight mb-4">Summary</h2>
            <div className="p-6 rounded-2xl border border-black/[0.07] bg-white">
              <p className="text-sm leading-relaxed text-black/70">{inv.summary}</p>
            </div>
          </section>
        )}

        {/* Root Cause */}
        {inv.root_cause && (
          <section className="mb-12">
            <h2 className="text-xl font-light tracking-tight mb-4">Root Cause</h2>
            <div className="p-6 rounded-2xl border border-black/[0.07] bg-white">
              <p className="text-sm leading-relaxed text-black/70">{inv.root_cause}</p>
            </div>
          </section>
        )}

        {/* Fix Details */}
        {(inv.affected_file || inv.patch_diff) && (
          <section className="mb-12">
            <h2 className="text-xl font-light tracking-tight mb-4">Fix Details</h2>
            
            {inv.affected_file && (
              <div className="mb-4 p-4 rounded-xl border border-black/[0.07] bg-white font-mono text-xs">
                <div className="text-black/40">File</div>
                <div className="mt-1">{inv.affected_file}:{inv.affected_line}</div>
              </div>
            )}

            {inv.patch_diff && (
              <div className="p-4 rounded-xl border border-black/[0.07] bg-white">
                <div className="text-xs text-black/40 mb-3 tracking-widest uppercase">Patch</div>
                <pre className="text-xs overflow-auto bg-black/[0.04] p-3 rounded border border-black/5 font-mono">
                  {inv.patch_diff}
                </pre>
              </div>
            )}
          </section>
        )}

        {/* GitHub PR */}
        {inv.pr_url && (
          <section className="mb-12">
            <h2 className="text-xl font-light tracking-tight mb-4">Pull Request</h2>
            <a
              href={inv.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors"
            >
              VIEW PR #{inv.pr_number} ↗
            </a>
          </section>
        )}

        {/* Explanation */}
        {inv.explanation && (
          <section className="mb-12">
            <h2 className="text-xl font-light tracking-tight mb-4">Explanation</h2>
            <div className="p-6 rounded-2xl border border-black/[0.07] bg-white">
              <p className="text-sm leading-relaxed text-black/70">{inv.explanation}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
