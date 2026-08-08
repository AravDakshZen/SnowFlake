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
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ name: string; email: string; avatarUrl: string | null }>({ name: '', email: '', avatarUrl: null })
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
    fetch('/api/auth/profile').then(r => r.json()).then((data) => {
      if (data?.user) {
        setProfile({ name: data.user.name ?? '', email: data.user.email ?? '', avatarUrl: data.user.avatarUrl ?? null })
      }
    }).catch(() => {})
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
        setApiKeys(key.keys ?? [])
      } catch {
        setFeedback('Settings could not be loaded. Please try again.')
        toastError('Settings could not be loaded', 'Please try again in a moment.')
      }
    }
    loadSettings()
  }, [])

  const handleLLMSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)
    
    const formData = new FormData(form)
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
      form.reset()
      if (projectId) {
        fetch(`/api/settings/llm?projectId=${encodeURIComponent(projectId)}`).then(r => r.json()).then((d) => setLLMConfigs(d)).catch(() => {})
      }
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
    const form = e.currentTarget
    setLoading(true)

    const formData = new FormData(form)
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
      form.reset()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error saving alert configuration'
      setFeedback(message)
      toastError('Could not save alert configuration', message)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    const name = String(formData.get('name') || '').trim()
    const avatarUrl = String(formData.get('avatarUrl') || '').trim()
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatarUrl }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Error saving profile')
      setProfile({ name: result.user?.name ?? name, email: result.user?.email ?? profile.email, avatarUrl: result.user?.avatarUrl ?? avatarUrl })
      toastSuccess('Profile updated', 'Your profile information has been saved.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error saving profile'
      toastError('Could not save profile', message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    const currentPassword = String(formData.get('currentPassword') || '')
    const newPassword = String(formData.get('newPassword') || '')
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Error changing password')
      form.reset()
      toastSuccess('Password changed', 'Use your new password next time you sign in.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error changing password'
      toastError('Could not change password', message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    const email = String(formData.get('email') || '').trim()
    try {
      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Error changing email')
      form.reset()
      toastSuccess('Confirmation email sent', 'Check your inbox to confirm the new email.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error changing email'
      toastError('Could not change email', message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Delete your account and all associated data? This cannot be undone.')) return
    setLoading(true)
    try {
      const response = await fetch('/api/auth/delete-account', { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Error deleting account')
      window.location.href = '/signin'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error deleting account'
      toastError('Could not delete account', message)
      setLoading(false)
    }
  }

  const handleGenerateKey = async () => {
    if (!projectId) { setFeedback('Create a project before generating an API key.'); return toastError('No project yet', 'Create a project before generating an API key.') }
    setLoading(true)
    try {
      const response = await fetch('/api/project/apikey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, action: 'regenerate' }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to generate API key')
      setGeneratedKey(result.apiKey)
      setApiKeys(result.keys ?? [])
      setFeedback('New API key generated. Copy it now; it will not be shown again.')
      toastSuccess('API key generated', 'Copy the key below — it will not be shown again.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate API key'
      setFeedback(message)
      toastError('Could not generate API key', message)
    } finally { setLoading(false) }
  }

  const handleCopyKey = async () => {
    if (!generatedKey) return
    try {
      await navigator.clipboard.writeText(generatedKey)
      toastSuccess('Copied to clipboard')
    } catch {
      toastError('Could not copy', 'Copy the key manually from the box above.')
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!projectId) return
    setLoading(true)
    try {
      const response = await fetch('/api/project/apikey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, action: 'revoke', keyId }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to revoke key')
      setApiKeys(result.keys ?? [])
      toastSuccess('API key revoked')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to revoke key'
      toastError('Could not revoke key', message)
    } finally { setLoading(false) }
  }

  const handleGitHubDisconnect = async () => {
    if (!projectId) return
    if (!confirm('Disconnect GitHub from this project? Auto-fix PR creation and CI integration will stop.')) return
    setLoading(true)
    try {
      const response = await fetch(`/api/github/repos?projectId=${encodeURIComponent(projectId)}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to disconnect GitHub')
      setGithubConfigs(null)
      setFeedback('GitHub disconnected.')
      toastSuccess('GitHub disconnected', 'Your GitHub account is no longer linked to this project.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to disconnect GitHub'
      toastError('Could not disconnect GitHub', message)
    } finally { setLoading(false) }
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
          {['llm', 'github', 'alerts', 'api', 'profile'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-light tracking-widest transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-black text-black'
                  : 'border-transparent text-black/40 hover:text-black'
              }`}
            >
              {tab === 'llm' ? 'LLM PROVIDERS' : tab === 'github' ? 'GITHUB' : tab === 'alerts' ? 'ALERTS' : tab === 'api' ? 'API KEY' : 'PROFILE'}
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

            {llmConfigs?.configs?.length ? (
              <div className="mt-8 p-6 rounded-xl border border-black/[0.07] bg-white">
                <h3 className="text-sm font-light tracking-widest mb-3">SAVED API KEYS</h3>
                <div className="space-y-3">
                  {llmConfigs.configs.map((config: any) => (
                    <div key={config.id} className="p-3 rounded-lg bg-black/5">
                      <div className="text-xs text-black/60">{config.provider} • {config.model}</div>
                      {config.maskedKey && <div className="mt-1 font-mono text-xs text-black/40">{config.maskedKey}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {activeTab === 'github' && (
          <section className="max-w-2xl">
            <RevealText className="text-2xl font-light tracking-tight mb-6">
              GitHub Integration
            </RevealText>
            
            <div className="p-6 rounded-xl border border-black/[0.07] bg-white">
              {githubConfigs?.repos?.length ? (
                <div>
                  <p className="text-sm text-black/60 mb-4">
                    Connected to GitHub. Automatic PR creation and CI integration are enabled for this project.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-light tracking-widest">CONNECTED</span>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGitHubDisconnect}
                      className="px-6 py-3 rounded-xl border border-red-900/20 bg-red-50 text-red-800 text-sm font-light tracking-widest hover:bg-red-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'DISCONNECTING…' : 'LOGOUT FROM THIS ACCOUNT'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
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
              )}
            </div>

            {githubConfigs?.repos?.length ? (
              <div className="mt-8 p-6 rounded-xl border border-black/[0.07] bg-white">
                <h3 className="text-sm font-light tracking-widest mb-3">ACCESSIBLE REPOSITORIES</h3>
                <div className="space-y-3">
                  {githubConfigs.repos.map((repo: any) => (
                    <div key={`${repo.owner}/${repo.name}`} className="p-3 rounded-lg bg-black/5">
                      <div className="text-sm font-light">{repo.owner}/{repo.name}</div>
                      {repo.language && <div className="text-xs text-black/40 mt-1">{repo.language}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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
              {generatedKey ? (
                <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <p className="text-xs font-medium text-amber-800 mb-2">NEW KEY — shown only once. Copy it now.</p>
                  <div className="font-mono text-xs bg-white border border-amber-200 rounded-lg p-3 overflow-auto break-all mb-3">
                    {generatedKey}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="px-4 py-2 rounded-lg bg-black text-white text-xs font-light tracking-widest hover:bg-black/85 transition-colors"
                  >
                    COPY KEY
                  </button>
                </div>
              ) : (
                <div className="font-mono text-sm bg-black/5 p-4 rounded-lg overflow-auto mb-4 break-all">
                  {apiKeys.length > 0 ? apiKeys[0].maskedKey : 'No API key generated yet'}
                </div>
              )}
              <p className="text-xs text-black/40 mb-4">
                Generate a key, then copy the full value immediately. The full key is never stored or shown again.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={!projectId || loading} onClick={handleGenerateKey} className="px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? 'GENERATING…' : 'GENERATE / REGENERATE KEY'}
                </button>
              </div>
            </div>

            {apiKeys.length > 0 && (
              <div className="mt-8 p-6 rounded-xl border border-black/[0.07] bg-white">
                <h3 className="text-sm font-light tracking-widest mb-3">ALL GENERATED KEYS</h3>
                <div className="space-y-3">
                  {apiKeys.map((key: any) => (
                    <div key={key.id} className="p-3 rounded-lg bg-black/5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-black/70 truncate">{key.maskedKey}</div>
                        <div className="text-xs text-black/40 mt-1">
                          {new Date(key.createdAt).toLocaleDateString()} • {key.revokedAt ? 'REVOKED' : 'ACTIVE'}
                        </div>
                      </div>
                      {!key.revokedAt && (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleRevokeKey(key.id)}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-light tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          REVOKE
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="max-w-2xl">
            <RevealText className="text-2xl font-light tracking-tight mb-6">
              Profile
            </RevealText>

            <form onSubmit={handleProfileSubmit} className="p-6 rounded-xl border border-black/[0.07] bg-white space-y-6">
              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">NAME</label>
                <input name="name" defaultValue={profile.name} placeholder="Your name" className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20" />
              </div>
              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">AVATAR URL</label>
                <input name="avatarUrl" defaultValue={profile.avatarUrl ?? ''} placeholder="https://..." className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20" />
              </div>
              <div className="text-xs text-black/40">Signed in as {profile.email}</div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {loading ? 'SAVING...' : 'SAVE PROFILE'}
              </button>
            </form>

            <RevealText className="text-2xl font-light tracking-tight mt-12 mb-6">
              Account Settings
            </RevealText>

            <form onSubmit={handleChangePassword} className="p-6 rounded-xl border border-black/[0.07] bg-white space-y-6">
              <h3 className="text-sm font-light tracking-widest">CHANGE PASSWORD</h3>
              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">CURRENT PASSWORD</label>
                <input type="password" name="currentPassword" placeholder="Current password" required className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20" />
              </div>
              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">NEW PASSWORD</label>
                <input type="password" name="newPassword" placeholder="At least 8 characters" required minLength={8} className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20" />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </button>
            </form>

            <form onSubmit={handleChangeEmail} className="p-6 rounded-xl border border-black/[0.07] bg-white space-y-6 mt-6">
              <h3 className="text-sm font-light tracking-widest">CHANGE EMAIL</h3>
              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">NEW EMAIL</label>
                <input type="email" name="email" placeholder="new@email.com" required className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20" />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {loading ? 'SENDING...' : 'SEND CONFIRMATION'}
              </button>
            </form>

            <div className="mt-6 p-6 rounded-xl border border-red-300 bg-red-50">
              <h3 className="text-sm font-light tracking-widest text-red-700 mb-2">DELETE ACCOUNT</h3>
              <p className="text-xs text-red-600/80 mb-4">
                Permanently delete your account and all associated projects, API keys, and configurations. This cannot be undone.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={handleDeleteAccount}
                className="px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-light tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'DELETING...' : 'DELETE ACCOUNT'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
