'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RevealText } from '@/components/reveal-text'
import { PixelIcon } from '@/components/pixel-icon'
import { toastError } from '@/lib/toasts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, RefreshCw, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function InvestigationsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [investigations, setInvestigations] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchInvestigations = useCallback(async () => {
    try {
      const projRes = await fetch('/api/project/current')
      const projData = await projRes.json()
      const id = projData.project?.id as string | undefined
      if (!id) { setIsLoading(false); return }
      const invRes = await fetch(`/api/investigations?projectId=${encodeURIComponent(id)}`)
      const invData = await invRes.json()
      setInvestigations(invData)
    } catch {}
    setIsLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchInvestigations() }, [fetchInvestigations])

  useEffect(() => {
    const interval = setInterval(fetchInvestigations, 30000)
    return () => clearInterval(interval)
  }, [fetchInvestigations])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchInvestigations()
  }

  const filtered = investigations?.investigations?.filter((inv: any) => {
    if (filter === 'all') return true
    return inv.status === filter
  }) || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
      case 'in_progress': return <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />
      case 'failed': return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
      default: return <Clock className="h-3.5 w-3.5 text-gray-500" />
    }
  }

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
              Investigations
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-16">
        
        {/* Filters */}
        <div className="flex gap-3 mb-8">
          {['all', 'in_progress', 'queued', 'completed', 'failed'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              className="text-xs tracking-widest"
            >
              {status === 'all' ? 'ALL' : status.replace('_', ' ').toUpperCase()}
            </Button>
          ))}
        </div>

        {/* Investigations List */}
        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl border border-black/[0.07] bg-white">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-2/3 bg-black/10 animate-pulse" />
                    <div className="h-4 w-1/2 bg-black/5 animate-pulse" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-black/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid gap-4">
            {filtered.map((inv: any) => (
              <div
                key={inv.id}
                className="group p-6 rounded-2xl border border-black/[0.07] bg-white hover:bg-[#fafaf8] cursor-pointer transition-all hover:border-black/[0.15] hover:shadow-sm relative"
                onClick={() => router.push(`/investigations/${inv.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(inv.status)}
                      <h3 className="text-lg font-light">{inv.question}</h3>
                    </div>
                    <p className="text-sm text-black/40 line-clamp-2">{inv.summary}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${
                      inv.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 
                      inv.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                      inv.status === 'failed' ? 'bg-red-100 text-red-700 border-red-200' : 
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {inv.status.replace('_', ' ')}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`/investigations/${inv.id}`, '_blank')
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Open in new tab</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                {inv.status === 'failed' && inv.root_cause && (
                  <div className="mb-3 text-xs text-red-600 whitespace-pre-wrap break-words">{inv.root_cause}</div>
                )}

                {inv.status === 'in_progress' && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analysis in progress...
                  </div>
                )}

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
                      className="text-blue-600 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
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
            <p className="mt-4 text-black/40">No {filter !== 'all' ? filter.replace('_', ' ') : ''} investigations yet.</p>
          </div>
        )}
      </main>
    </div>
  )
}
