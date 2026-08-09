'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RevealText } from '@/components/reveal-text'
import { toastError, toastSuccess } from '@/lib/toasts'
import { DiffView } from '@/components/diff-viewer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, FileCode, AlertTriangle, CheckCircle2, Clock, Copy } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function generateInvestigationTitle(inv: any): string {
  if (inv.root_cause) {
    const cause = inv.root_cause
    if (cause.length > 80) return cause.substring(0, 77) + '...'
    return cause
  }
  if (inv.affected_file) {
    const file = inv.affected_file.split('/').pop() || inv.affected_file
    return `Issue in ${file}`
  }
  return inv.question || 'Investigation'
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-700 border-green-200'
    case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'failed': return 'bg-red-100 text-red-700 border-red-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function InvestigationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [investigation, setInvestigation] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditingPatch, setIsEditingPatch] = useState(false)
  const [patchDraft, setPatchDraft] = useState('')
  const [isSavingPatch, setIsSavingPatch] = useState(false)

  useEffect(() => {
    if (id) {
      fetch(`/api/investigations/${id}`)
        .then(res => res.json())
        .then(data => {
          setInvestigation(data)
          setIsLoading(false)
        })
        .catch(() => { setIsLoading(false); toastError('Could not load investigation details', 'Please try again in a moment.') })
    }
  }, [id])

  if (isLoading) {
    return (
      <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased flex items-center justify-center">
        <div className="text-black/40">Loading investigation...</div>
      </div>
    )
  }

  if (!investigation?.investigation) {
    return (
      <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased flex items-center justify-center">
        <div className="text-center">
          <p className="text-black/40 mb-4">Investigation not found</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            GO BACK
          </Button>
        </div>
      </div>
    )
  }

  const inv = investigation.investigation
  const investigationTitle = generateInvestigationTitle(inv)

  const handleSavePatch = async () => {
    setIsSavingPatch(true)
    try {
      const res = await fetch(`/api/investigations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchDiff: patchDraft }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save patch')
      }
      const updated = await res.json()
      setInvestigation((prev: any) => ({
        ...prev,
        investigation: {
          ...prev.investigation,
          patch_diff: updated.patch_diff,
        },
      }))
      setIsEditingPatch(false)
      toastSuccess('Patch saved', 'The updated patch will be used for the pull request.')
    } catch (error: any) {
      toastError('Could not save patch', error.message || 'Please try again.')
    } finally {
      setIsSavingPatch(false)
    }
  }

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={getStatusColor(inv.status)}>
              {inv.status.replace('_', ' ')}
            </Badge>
            {inv.pr_url && (
              <a href={inv.pr_url} target="_blank" rel="noopener noreferrer">
                <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 cursor-pointer">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  PR #{inv.pr_number}
                </Badge>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 md:px-12 py-16">
        
        {/* Question - Now shows relatable title */}
        <section className="mb-12">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4 cursor-help" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
                  {investigationTitle}
                </h1>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
                <p className="text-sm">{inv.question}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {inv.question && inv.question !== investigationTitle && (
            <p className="text-sm text-black/50 font-mono">{inv.question}</p>
          )}
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

        {(inv.status === 'completed' && !inv.patch_diff && !inv.pr_url) || inv.status === 'failed' ? (
          <section className="mb-12">
            <h2 className="text-xl font-light tracking-tight mb-4">Fix Details</h2>
            <div className={`p-6 rounded-2xl border ${inv.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
              {inv.status === 'failed' ? (
                <p className="text-sm leading-relaxed text-red-900">
                  This investigation failed. {inv.root_cause ? 'The captured error is below — you can retry the analysis or start a new investigation.' : 'No fix was generated. You can retry the analysis or start a new investigation.'}
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-amber-900">
                  This investigation completed, but no patch was generated and no pull request was created.
                  The analysis below may still explain the issue; you can restart the investigation or connect
                  GitHub to enable automatic fixes.
                </p>
              )}
            </div>
          </section>
        ) : null}

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light tracking-tight">Fix Details</h2>
              {inv.patch_diff && (
                <button
                  onClick={() => {
                    if (isEditingPatch) {
                      setIsEditingPatch(false)
                      setPatchDraft(inv.patch_diff)
                    } else {
                      setPatchDraft(inv.patch_diff)
                      setIsEditingPatch(true)
                    }
                  }}
                  className="text-xs tracking-widest px-4 py-2 rounded-lg border border-black/10 hover:bg-black hover:text-white transition-colors"
                >
                  {isEditingPatch ? 'CANCEL' : 'EDIT PATCH'}
                </button>
              )}
            </div>
            
            {inv.affected_file && (
              <div className="mb-4 p-4 rounded-xl border border-black/[0.07] bg-white font-mono text-xs">
                <div className="text-black/40">File</div>
                <div className="mt-1">{inv.affected_file}:{inv.affected_line}</div>
              </div>
            )}

            {inv.patch_diff && (
              <div className="p-4 rounded-xl border border-black/[0.07] bg-white">
                <div className="text-xs text-black/40 mb-3 tracking-widest uppercase">
                  {isEditingPatch ? 'Edit Patch' : 'Changes'}
                </div>

                {isEditingPatch ? (
                  <div>
                    <textarea
                      value={patchDraft}
                      onChange={(e) => setPatchDraft(e.target.value)}
                      spellCheck={false}
                      className="w-full min-h-[320px] text-xs font-mono bg-black/[0.04] p-3 rounded border border-black/10 focus:outline-none focus:border-black/30 resize-y leading-relaxed"
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={handleSavePatch}
                        disabled={isSavingPatch}
                        className="text-xs tracking-widest px-5 py-2 rounded-lg bg-black text-white hover:bg-black/85 transition-colors disabled:opacity-50"
                      >
                        {isSavingPatch ? 'SAVING...' : 'SAVE PATCH'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <DiffView patch={inv.patch_diff} />
                )}
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
