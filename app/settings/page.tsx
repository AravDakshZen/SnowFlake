'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RevealText } from '@/components/reveal-text'
import { PixelIcon } from '@/components/pixel-icon'
import { PROVIDERS } from '@/lib/llm'
import { toastSuccess, toastError, toastInfo, toastLoading } from '@/lib/toasts'

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('llm')
  const [loading, setLoading] = useState(false)
  const [llmConfigs, setLLMConfigs] = useState<any>(null)
  const [alertConfigs, setAlertConfigs] = useState<any>(null)
  const [githubConfigs, setGithubConfigs] = useState<any>(null)
  const [apiKey, setApiKey] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState('openai')
  const [feedback, setFeedback] = useState('')
  const selectedProviderDefinition = PROVIDERS[selectedProvider]

  // The GitHub OAuth callback redirects back to /settings?github=<status>.
  // Surface that status as a toast once, then strip the param from the URL.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('github')
    if (!status) return
    const url = new URL(window.location.href)
    url.searchParams.delete('github')
    window.history.replaceState(null, '', url.toString())
    const messages: Record<string, { kind: 'success' | 'error' | 'info'; title: string; description?: string }> = {
      connected: { kind: 'success', title: 'GitHub connected', description: 'Your repository integration is ready to use.' },
      cancelled: { kind: 'info', title: 'GitHub authorization cancelled' },
      invalid: { kind: 'error', title: 'GitHub connection failed', description: 'The authorization request was invalid. Please try again.' },
      not_configured: { kind: 'error', title: 'GitHub is not configured', description: 'Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to your environment, then retry.' },
      not_found: { kind: 'error', title: 'Project not found', description: 'Create a project before connecting GitHub.' },
      failed: { kind: 'error', title: 'GitHub connection failed', description: 'The OAuth exchange did not complete. Check the GitHub App callback URL.' },
    }
    const config = messages[status]
    if (!config) return
    if (config.kind === 'success') toastSuccess(config.title, config.description)
    else if (config.kind === 'error') toastError(config.title, config.description)
    else toastInfo(config.title, config.description)
  }, [])

  useEffect(() => {
    setMounted(true)
    async function loadSettings() {
      try {
        const projectResponse = await fetch('/api/project/current')
        const projectData = await projectResponse.json()
        const id = projectData.project?.id
        if (!projectResponse.ok || !id) {
          toastError('No project yet', projectData.error || 'Create a project before configuring integrations.')
          return
        }
        setProjectId(id)
        const query = `?projectId=${encodeURIComponent(id)}`
        const [llm, alerts, github, key] = await Promise.all([
          fetch(`/api/settings/llm${query}`).then(r => r.json()),
          fetch(`/api/settings/alerts${query}`).then(r => r.json()),
          fetch(`/api/github/repos${query}`).then(r => r.json()),
          fetch(`/api/project/apikey${query}`).then(r => r.json()),
        ])
        setLLMConfigs(llm)
        setAlertConfigs(alerts)
        setGithubConfigs(github)
        setApiKey(key)
      } catch {
        setFeedback('Settings could not be loaded. Please try again.')
        toastError('Settings could not be loaded', 'Please try again in a moment.')
      }
    }
    loadSettings()
  }, [])

  const handleLLMSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      provider: formData.get('provider'),
      model: formData.get('model'),
      api_key: formData.get('api_key'),
      base_url: formData.get('base_url') || null,
      project_id: projectId,
    }

    try {
      const response = await fetch('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Error saving LLM configuration')
      setFeedback('LLM configuration saved.')
      toastSuccess('LLM configuration saved', `${selectedProviderDefinition.name} · ${data.model} is now the active provider.`)
      e.currentTarget.reset()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error saving LLM configuration'
      setFeedback(message)
      toastError('Could not save LLM configuration', message)
    } finally {
      setLoading(false)
    }
  }

  const handleAlertSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      slack_webhook_url: formData.get('slack_webhook') || null,
      email_address: formData.get('email') || null,
      alert_on: ['high_severity', 'new_cluster'],
      project_id: projectId,
    }

    try {
      const response = await fetch('/api/settings/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Error saving alert configuration')
      setFeedback('Alert configuration saved.')
      toastSuccess('Alert configuration saved', 'You will now be notified on new high-severity clusters.')
      e.currentTarget.reset()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error saving alert configuration'
      setFeedback(message)
      toastError('Could not save alert configuration', message)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-xl">←</button>
            <h1 className="text-xl font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
              Settings
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-16">
        {feedback && <p role="status" className="mb-6 rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-black/65">{feedback}</p>}
        
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-black/[0.06]">
          {['llm', 'github', 'alerts', 'api'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-light tracking-widest transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-black text-black'
                  : 'border-transparent text-black/40 hover:text-black'
              }`}
            >
              {tab === 'llm' ? 'LLM PROVIDERS' : tab === 'github' ? 'GITHUB' : tab === 'alerts' ? 'ALERTS' : 'API KEY'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'llm' && (
          <section className="max-w-2xl">
            <RevealText className="text-2xl font-light tracking-tight mb-6">
              LLM Configuration
            </RevealText>
            
            <form onSubmit={handleLLMSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-xs tracking-widest text-black/40">PROVIDER</label>
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-black/[0.07] bg-white px-4 py-3">
                  <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-black text-xs font-semibold tracking-tight text-white">{selectedProviderDefinition.icon}</span>
                  <div className="min-w-0"><p className="text-sm font-medium">{selectedProviderDefinition.name}</p><p className="truncate text-xs text-black/45">Provider brand and available model catalog</p></div>
                </div>
                <select name="provider" value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value)} required className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20">
                  {Object.values(PROVIDERS).map((provider) => <option key={provider.id} value={provider.id}>{provider.icon}  {provider.name}</option>)}
                </select>
                <p className="mt-2 text-xs text-black/45">{selectedProviderDefinition.description}</p>
              </div>

              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">MODEL</label>
                <select name="model" defaultValue={selectedProviderDefinition.models[0]} key={selectedProvider} required className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20">
                  {selectedProviderDefinition.models.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
              </div>

              {selectedProviderDefinition.defaultBaseUrl && <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">BASE URL</label>
                <input type="url" name="base_url" defaultValue={selectedProviderDefinition.defaultBaseUrl} className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20" />
              </div>}

              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">API KEY</label>
                <input 
                  type="password" 
                  name="api_key" 
                  placeholder="Your API key (encrypted)" 
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {loading ? 'SAVING...' : 'SAVE CONFIGURATION'}
              </button>
            </form>

            {llmConfigs?.data && (
              <div className="mt-8 p-6 rounded-xl border border-black/[0.07] bg-white">
                <h3 className="text-sm font-light tracking-widest mb-3">ACTIVE CONFIGURATIONS</h3>
                <div className="space-y-2">
                  {llmConfigs.data.map((config: any) => (
                    <div key={config.id} className="text-xs text-black/60">
                      {config.provider} • {config.model}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'github' && (
          <section className="max-w-2xl">
            <RevealText className="text-2xl font-light tracking-tight mb-6">
              GitHub Integration
            </RevealText>
            
            <div className="p-6 rounded-xl border border-black/[0.07] bg-white">
              <p className="text-sm text-black/60 mb-4">
                Connect your GitHub account to enable automatic PR creation and CI integration.
              </p>
              <button type="button" disabled={!projectId || loading} onClick={async () => {
                if (!projectId) { setFeedback('Create a project before connecting GitHub.'); return toastError('No project yet', 'Create a project before connecting GitHub.') }
                setLoading(true)
                setFeedback('Opening GitHub authorization…')
                toastInfo('Opening GitHub authorization', 'You will be redirected to GitHub to grant repo access.')
                window.location.href = `/api/github/connect?projectId=${encodeURIComponent(projectId)}`
              }} className="px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? 'OPENING GITHUB…' : 'CONNECT GITHUB'}
              </button>
            </div>

            {githubConfigs?.data && (
              <div className="mt-8 p-6 rounded-xl border border-black/[0.07] bg-white">
                <h3 className="text-sm font-light tracking-widest mb-3">CONNECTED REPOSITORIES</h3>
                <div className="space-y-3">
                  {githubConfigs.data.map((repo: any) => (
                    <div key={repo.id} className="p-3 rounded-lg bg-black/5">
                      <div className="text-sm font-light">{repo.full_name}</div>
                      <div className="text-xs text-black/40 mt-1">{repo.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'alerts' && (
          <section className="max-w-2xl">
            <RevealText className="text-2xl font-light tracking-tight mb-6">
              Alert Configuration
            </RevealText>
            
            <form onSubmit={handleAlertSubmit} className="space-y-6">
              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">SLACK WEBHOOK URL</label>
                <input 
                  type="url" 
                  name="slack_webhook" 
                  placeholder="https://hooks.slack.com/..." 
                  className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  name="email" 
                  placeholder="your@email.com" 
                  className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {loading ? 'SAVING...' : 'SAVE ALERTS'}
              </button>
            </form>
          </section>
        )}

        {activeTab === 'api' && (
          <section className="max-w-2xl">
            <RevealText className="text-2xl font-light tracking-tight mb-6">
              API Key
            </RevealText>
            
            <div className="p-6 rounded-xl border border-black/[0.07] bg-white">
              <p className="text-xs text-black/40 tracking-widest uppercase mb-4">YOUR API KEY</p>
              <div className="font-mono text-sm bg-black/5 p-4 rounded-lg overflow-auto mb-4 break-all">
                {apiKey?.keyPrefix ? `${apiKey.keyPrefix}...` : 'No API key generated yet'}
              </div>
              <p className="text-xs text-black/40 mb-4">
                Generate a key, then copy the full value immediately. The full key is never stored or shown again.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={!projectId || loading} onClick={async () => {
                  if (!projectId) { setFeedback('Create a project before generating an API key.'); return toastError('No project yet', 'Create a project before generating an API key.') }
                  setLoading(true)
                  try {
                    const response = await fetch('/api/project/apikey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, action: 'regenerate' }) })
                    const result = await response.json()
                    if (!response.ok) throw new Error(result.error || 'Unable to generate API key')
                    setApiKey({ keyPrefix: result.apiKey.slice(0, 20), maskedKey: result.maskedKey })
                    setFeedback('New API key generated. Copy it now; it will not be shown again.')
                    toastSuccess('API key generated', 'Copied to clipboard. It will not be shown again.')
                    await navigator.clipboard?.writeText(result.apiKey)
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unable to generate API key'
                    setFeedback(message)
                    toastError('Could not generate API key', message)
                  } finally { setLoading(false) }
                }} className="px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? 'GENERATING…' : 'GENERATE / REGENERATE KEY'}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
