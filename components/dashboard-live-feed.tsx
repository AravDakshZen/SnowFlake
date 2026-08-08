'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toastSuccess, toastError } from '@/lib/toasts'

type FeedEvent = { type: string; timestamp?: string; message?: string; [key: string]: unknown }

const labels: Record<string, string> = {
  connected: 'Live stream connected',
  'log:received': 'Error log received',
  'log:fingerprinted': 'Error fingerprinted',
  'investigation:queued': 'Investigation queued',
  'investigation:progress': 'Investigation in progress',
  'investigation:complete': 'Investigation complete',
  'pr:created': 'Pull request created',
  'ci:watching': 'CI checks being watched',
  'ci:failed_reinvestigating': 'CI failed; re-investigating',
  'alert:escalated': 'Alert escalated',
}

export function DashboardLiveFeed({ projectId }: { projectId?: string }) {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [connected, setConnected] = useState(false)
  const toastedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!projectId) return
    const source = new EventSource(`/api/logs/stream?projectId=${encodeURIComponent(projectId)}`)
    source.onopen = () => setConnected(true)
    source.onmessage = (event) => {
      try {
        const next = JSON.parse(event.data) as FeedEvent
        if (next.type !== 'heartbeat') setEvents((current) => [...current, next].slice(-12))

        const eventId = (next.id as string | undefined) ?? `${next.type}-${next.timestamp ?? Date.now()}`
        if (toastedIds.current.has(eventId)) return
        const message = next.message || labels[next.type] || next.type

        if (next.type === 'investigation:complete') {
          toastedIds.current.add(eventId)
          toastSuccess('Investigation complete', message)
        } else if (next.type === 'pr:created') {
          toastedIds.current.add(eventId)
          toastSuccess('Pull request created', message)
        } else if (next.type === 'alert:escalated') {
          toastedIds.current.add(eventId)
          toastError('Alert escalated', message)
        }
      } catch {}
    }
    source.onerror = () => setConnected(false)
    return () => source.close()
  }, [projectId])

  const active = useMemo(() => events.some((event) => event.type.includes('progress') || event.type.includes('queued')), [events])

  return (
    <section className="border-t border-black/10 pt-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div><p className="text-xs tracking-[0.18em] text-black/45">LIVE ACTIVITY</p><h2 className="mt-1 text-xl font-medium tracking-tight">Investigation feed</h2></div>
        <div className="flex items-center gap-2 text-xs text-black/45"><span className={`size-2 rounded-full ${active ? 'animate-pulse bg-amber-500' : connected ? 'bg-emerald-500' : 'bg-black/20'}`} />{connected ? 'Connected' : 'Waiting'}</div>
      </div>
      <div className="flex max-h-72 flex-col gap-2 overflow-auto rounded-2xl border border-black/10 bg-white p-3">
        {events.length === 0 ? <p className="px-3 py-8 text-center text-sm text-black/40">Live investigation events will appear here.</p> : events.slice().reverse().map((event, index) => {
          const tone = event.type.includes('escalated') ? 'text-red-600' : event.type.includes('complete') || event.type.includes('created') ? 'text-emerald-600' : event.type.includes('progress') || event.type.includes('queued') ? 'text-amber-600' : 'text-sky-600'
          return <div key={`${event.type}-${event.timestamp}-${index}`} className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-black/[0.03]"><span className={`mt-1 size-2 shrink-0 rounded-full bg-current ${tone}`} /><div className="min-w-0"><p className="text-sm text-black/75">{event.message || labels[event.type] || event.type}</p><p className="mt-0.5 text-[11px] text-black/35">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'just now'}</p></div></div>
        })}
      </div>
    </section>
  )
}
