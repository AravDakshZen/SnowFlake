'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreateEventForm, type CreateEventData } from '@/components/events/CreateEventForm'
import { toastSuccess, toastError } from '@/lib/toasts'

export default function NewEventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [repos, setRepos] = useState<Array<{ owner: string; name: string; defaultBranch: string }>>([])
  const [projectId, setProjectId] = useState<string>('')

  useEffect(() => {
    fetch('/api/project/current')
      .then(r => r.json())
      .then(d => {
        if (d.project?.id) setProjectId(d.project.id)
      })
      .catch(() => {})

    fetch('/api/github/repos')
      .then(r => r.json())
      .then(d => {
        if (d.repos) {
          setRepos(d.repos.map((r: any) => ({
            owner: r.owner?.login || r.owner,
            name: r.name,
            defaultBranch: r.defaultBranch || r.default_branch || 'main',
          })))
        }
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (data: CreateEventData) => {
    if (!projectId) {
      toastError('No project', 'Please create a project first.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectId, triggerNow: data.triggerType === 'immediate' }),
      })
      const result = await res.json()
      if (res.ok) {
        toastSuccess('Event created', `"${data.name}" is now running.`)
        router.push('/dashboard')
      } else {
        toastError('Failed to create event', result.error || 'Please try again.')
      }
    } catch {
      toastError('Failed to create event', 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <a href="/" className="font-pixel text-xs tracking-[0.25em] text-black/50">SnowFlake</a>
          <a href="/dashboard" className="text-xs text-black/40 hover:text-black transition-colors">← Back to dashboard</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-12 py-16">
        <CreateEventForm
          onSubmit={handleSubmit}
          loading={loading}
          repos={repos}
        />
      </main>
    </div>
  )
}
