'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RevealText } from '@/components/reveal-text'
import { PixelIcon } from '@/components/pixel-icon'
import { ProviderChip, getProviderBrand } from '@/components/provider-icons'
import { ProviderSelect, ProviderLogo } from '@/components/provider-select'
import { PROVIDERS } from '@/lib/llm'
import { toastSuccess, toastError, toastInfo, toastLoading } from '@/lib/toasts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { RefreshCw, LogOut, CheckCircle2, XCircle } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('llm')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [llmConfigs, setLLMConfigs] = useState<any>(null)
  const [alertConfigs, setAlertConfigs] = useState<any>(null)
  const [githubConfigs, setGithubConfigs] = useState<any>(null)
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ name: string; email: string; avatarUrl: string | null }>({ name: '', email: '', avatarUrl: null })
  const [mounted, setMounted] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState('openai')
  const [events, setEvents] = useState<any[]>([])
  const [githubProfile, setGithubProfile] = useState<{ login: string; avatarUrl: string | null; name?: string } | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingEventModels, setEditingEventModels] = useState<{ fixProvider: string; fixModel: string; commitProvider: string; commitModel: string }>({ fixProvider: '', fixModel: '', commitProvider: '', commitModel: '' })
  const defaultPrefilled = React.useRef(false)
  const [eventForm, setEventForm] = useState<{
    name: string; repoOwner: string; repoName: string; defaultBranch: string; triggerNow: boolean;
    fixProvider: string; fixModel: string; commitProvider: string; commitModel: string;
  }>({
    name: '', repoOwner: '', repoName: '', defaultBranch: 'main', triggerNow: true,
    fixProvider: '', fixModel: '', commitProvider: '', commitModel: '',
  })
  const selectedProviderDefinition = PROVIDERS[selectedProvider]
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
  const [modelValue, setModelValue] = useState(selectedProviderDefinition?.models[0] ?? '')
  const [apiKeyValue, setApiKeyValue] = useState('')
  const [baseUrlValue, setBaseUrlValue] = useState(selectedProviderDefinition?.defaultBaseUrl ?? '')
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [dynamicModels, setDynamicModels] = useState<any[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  const loadSettings = useCallback(async () => {
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
      toastError('Settings could not be loaded', 'Please try again in a moment.')
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  // The GitHub OAuth callback redirects back to /settings?github=<status>.
  // Surface that status as a toast once, strip the param, and reload the
  // GitHub config so the UI reflects the new connection without a refresh.
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
    if (status === 'connected') loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setMounted(true)
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab && ['llm', 'github', 'alerts', 'api', 'profile'].includes(tab)) {
      setActiveTab(tab)
    }
    fetch('/api/auth/profile').then(r => r.json()).then((data) => {
      if (data?.user) {
        setProfile({ name: data.user.name ?? '', email: data.user.email ?? '', avatarUrl: data.user.avatarUrl ?? null })
      }
    }).catch(() => {})
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (!githubConfigs?.repos?.length || !projectId) return
    fetch(`/api/github/profile?projectId=${encodeURIComponent(projectId)}`)
      .then(r => r.json())
      .then((data) => {
        if (data?.profile) {
          setGithubProfile({ login: data.profile.login, avatarUrl: data.profile.avatarUrl ?? null, name: data.profile.name })
        }
      })
      .catch(() => {})
  }, [githubConfigs?.repos?.length, projectId])

  useEffect(() => {
    if (projectId) loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // When the saved LLM configs first arrive, prefill the create-event form
  // with the project's default provider + model so the event form always
  // reflects the active config and the worker can actually call it.
  useEffect(() => {
    if (defaultPrefilled.current) return
    const configs: any[] = llmConfigs?.configs ?? []
    if (!configs.length) return
    const def = configs.find((c: any) => c.is_default) ?? configs[0]
    if (!def?.provider || !def?.model) return
    defaultPrefilled.current = true
    setEventForm((f) => ({
      ...f,
      fixProvider: def.provider,
      fixModel: def.model,
      commitProvider: def.provider,
      commitModel: def.model,
    }))
  }, [llmConfigs])

  const savedLlmOptions: { value: string; label: string }[] = (llmConfigs?.configs ?? [])
    .filter((c: any) => c.provider && c.model)
    .map((c: any) => ({ value: `${c.provider}|${c.model}`, label: `${PROVIDERS[c.provider]?.name ?? c.provider} · ${c.model}${c.is_default ? ' (default)' : ''}` }))

  const handleLLMSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setActionLoading('llm')
    
    const data = {
      provider: selectedProvider,
      model: modelValue,
      api_key: apiKeyValue,
      base_url: baseUrlValue || null,
      project_id: projectId,
      config_id: editingConfigId,
    }

    try {
      const response = await fetch('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Error saving LLM configuration')
      toastSuccess('LLM configuration saved', `${selectedProviderDefinition.name} · ${data.model} is now the active provider.`)
      setEditingConfigId(null)
      setApiKeyValue('')
      if (projectId) {
        fetch(`/api/settings/llm?projectId=${encodeURIComponent(projectId)}`).then(r => r.json()).then((d) => setLLMConfigs(d)).catch(() => {})
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error saving LLM configuration'
      toastError('Could not save LLM configuration', message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLLMEditConfig = (config: any) => {
    setSelectedProvider(config.provider)
    setModelValue(config.model)
    setApiKeyValue('')
    setBaseUrlValue(config.base_url ?? PROVIDERS[config.provider]?.defaultBaseUrl ?? '')
    setEditingConfigId(config.id)
    fetchDynamicModels(config.provider)
    toastInfo('Editing saved configuration', 'Change the model or paste a new API key. Leave the key blank to keep the saved one.')
  }

  const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = event.target.value
    setSelectedProvider(provider)
    setModelValue(PROVIDERS[provider]?.models[0] ?? '')
    setBaseUrlValue(PROVIDERS[provider]?.defaultBaseUrl ?? '')
    setEditingConfigId(null)
    fetchDynamicModels(provider)
  }

  const fetchDynamicModels = async (provider: string) => {
    setModelsLoading(true)
    try {
      const params = new URLSearchParams({ provider })
      if (apiKeyValue) {
        params.set('apiKey', apiKeyValue)
      }
      const response = await fetch(`/api/settings/models?${params}`)
      const data = await response.json()
      if (response.ok && data.models?.length) {
        setDynamicModels(data.models)
      } else {
        setDynamicModels([])
      }
    } catch {
      setDynamicModels([])
    } finally {
      setModelsLoading(false)
    }
  }

  const handleLLMSetDefault = async (configId: string) => {
    setActionLoading(`llm-default-${configId}`)
    try {
      const response = await fetch('/api/settings/llm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: configId, isDefault: true, project_id: projectId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Error setting default')
      toastSuccess('Default provider updated', 'Future investigations will prefer this configuration.')
      if (projectId) {
        const fresh = await fetch(`/api/settings/llm?projectId=${encodeURIComponent(projectId)}`).then(r => r.json())
        setLLMConfigs(fresh)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error setting default'
      toastError('Could not update default', message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLLMDeleteConfig = async (configId: string) => {
    if (!confirm('Remove this LLM configuration and its stored API key?')) return
    setActionLoading(`llm-delete-${configId}`)
    try {
      const response = await fetch(`/api/settings/llm?id=${encodeURIComponent(configId)}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Error removing configuration')
      toastSuccess('LLM configuration removed')
      if (projectId) {
        const fresh = await fetch(`/api/settings/llm?projectId=${encodeURIComponent(projectId)}`).then(r => r.json())
        setLLMConfigs(fresh)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error removing configuration'
      toastError('Could not remove configuration', message)
    } finally {
      setActionLoading(null)
    }
  }

  const loadEvents = async () => {
    if (!projectId) return
    try {
      const res = await fetch(`/api/events?projectId=${encodeURIComponent(projectId)}`)
      const data = await res.json()
      if (res.ok) setEvents(data.events ?? [])
    } catch { /* ignore */ }
  }

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!projectId) { return toastError('No project yet', 'Create a project before adding an event.') }
    if (!eventForm.name.trim() || !eventForm.repoOwner.trim() || !eventForm.repoName.trim()) {
      return toastError('Missing fields', 'Event name, repo owner and repo name are required.')
    }
    setActionLoading('event-create')
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...eventForm, projectId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Error creating event')
      const configs: any[] = llmConfigs?.configs ?? []
      const def = configs.find((c: any) => c.is_default) ?? configs[0]
      setEventForm({
        name: '', repoOwner: '', repoName: '', defaultBranch: 'main', triggerNow: true,
        fixProvider: def?.provider ?? '', fixModel: def?.model ?? '',
        commitProvider: def?.provider ?? '', commitModel: def?.model ?? '',
      })
      await loadEvents()
      toastSuccess('Event created', `"${result.event?.name}" is now watching ${result.event?.repo_owner}/${result.event?.repo_name}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error creating event'
      toastError('Could not create event', message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleTriggerEvent = async (id: string) => {
    setActionLoading(`event-run-${id}`)
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerNow: true }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Error triggering event')
      await loadEvents()
      toastSuccess('Event triggered', `"${result.event?.name}" is now analyzing the latest commit.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error triggering event'
      toastError('Could not trigger event', message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteEvent = async (id: string, name: string) => {
    if (!confirm(`Delete event "${name}"? Its history will be removed.`)) return
    setActionLoading(`event-delete-${id}`)
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Error deleting event')
      await loadEvents()
      toastSuccess('Event deleted', `"${name}" removed.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error deleting event'
      toastError('Could not delete event', message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEventModelUpdate = async (id: string) => {
    setActionLoading(`event-models-${id}`)
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingEventModels }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Error updating event models')
      setEditingEventId(null)
      await loadEvents()
      toastSuccess('Event models updated', 'Future runs will use the selected providers.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error updating event models'
      toastError('Could not update event models', message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAlertSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setActionLoading('alerts')

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
      toastSuccess('Alert configuration saved', 'You will now be notified on new high-severity clusters.')
      form.reset()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error saving alert configuration'
      toastError('Could not save alert configuration', message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setActionLoading('profile')
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
      setActionLoading(null)
    }
  }

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setActionLoading('password')
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
      setActionLoading(null)
    }
  }

  const handleChangeEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setActionLoading('email')
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
      setActionLoading(null)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Delete your account and all associated data? This cannot be undone.')) return
    setActionLoading('delete')
    try {
      const response = await fetch('/api/auth/delete-account', { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Error deleting account')
      window.location.href = '/signin'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error deleting account'
      toastError('Could not delete account', message)
      setActionLoading(null)
    }
  }

  const handleGenerateKey = async () => {
    if (!projectId) { return toastError('No project yet', 'Create a project before generating an API key.') }
    setActionLoading('apikey')
    try {
      const response = await fetch('/api/project/apikey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, action: 'regenerate' }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to generate API key')
      setGeneratedKey(result.apiKey)
      setApiKeys(result.keys ?? [])
      toastSuccess('API key generated', 'Copy the key below — it will not be shown again.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate API key'
      toastError('Could not generate API key', message)
    } finally { setActionLoading(null) }
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
    setActionLoading('revoke')
    try {
      const response = await fetch('/api/project/apikey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, action: 'revoke', keyId }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to revoke key')
      setApiKeys(result.keys ?? [])
      toastSuccess('API key revoked')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to revoke key'
      toastError('Could not revoke key', message)
    } finally { setActionLoading(null) }
  }

  const handleRepoSwitch = async (owner: string, name: string) => {
    if (!projectId) return
    setActionLoading('repo-switch')
    try {
      const response = await fetch('/api/github/repos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, repoOwner: owner, repoName: name }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to switch repository')
      setGithubConfigs((prev: any) => ({
        ...prev,
        activeConfig: {
          owner,
          name,
          defaultBranch: result.config?.default_branch ?? prev?.activeConfig?.defaultBranch ?? 'main',
        },
      }))
      toastSuccess('Repository switched', `Auto-fix PRs will now target ${owner}/${name}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to switch repository'
      toastError('Could not switch repository', message)
    } finally { setActionLoading(null) }
  }

  const handleGitHubDisconnect = async () => {
    if (!projectId) return
    if (!confirm('Disconnect GitHub from this project? Auto-fix PR creation and CI integration will stop.')) return
    setActionLoading('github')
    try {
      const response = await fetch(`/api/github/repos?projectId=${encodeURIComponent(projectId)}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to disconnect GitHub')
      setGithubConfigs(null)
      setGithubProfile(null)
      setEvents([])
      toastSuccess('GitHub disconnected', 'Your GitHub account is no longer linked to this project.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to disconnect GitHub'
      toastError('Could not disconnect GitHub', message)
    } finally { setActionLoading(null) }
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
            
            <form id="llm-config-form" onSubmit={handleLLMSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-xs tracking-widest text-black/40">PROVIDER</label>
                <ProviderSelect
                  providers={Object.values(PROVIDERS).map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    isFree: p.isFree,
                  }))}
                  value={selectedProvider}
                  onChange={(val) => {
                    setSelectedProvider(val)
                    setModelValue(PROVIDERS[val]?.models[0] ?? '')
                    setBaseUrlValue(PROVIDERS[val]?.defaultBaseUrl ?? '')
                    setEditingConfigId(null)
                    fetchDynamicModels(val)
                  }}
                />
                {selectedProviderDefinition.isFree && (
                  <Badge variant="secondary" className="mt-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    FREE TIER AVAILABLE
                  </Badge>
                )}
                <p className="mt-2 text-xs text-black/45">{selectedProviderDefinition.description}</p>
              </div>

              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">MODEL</label>
                <div className="flex gap-2">
                  <select 
                    name="model" 
                    value={modelValue} 
                    onChange={(e) => setModelValue(e.target.value)} 
                    required 
                    className="flex-1 px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                  >
                    {modelsLoading ? (
                      <option value="">Loading models...</option>
                    ) : dynamicModels.length > 0 ? (
                      dynamicModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} {model.isFree ? '🆓 FREE' : ''} {model.contextLength ? `(${Math.round(model.contextLength / 1000)}k)` : ''}
                        </option>
                      ))
                    ) : (
                      selectedProviderDefinition?.models.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))
                    )}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fetchDynamicModels(selectedProvider)}
                    disabled={modelsLoading}
                    title="Refresh models from provider"
                  >
                    {modelsLoading ? <Spinner /> : <RefreshCw className="size-4" />}
                  </Button>
                </div>
                {dynamicModels.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-black/45">
                      {dynamicModels.length} models loaded
                    </span>
                    {dynamicModels.filter(m => m.isFree).length > 0 && (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        {dynamicModels.filter(m => m.isFree).length} free
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {selectedProviderDefinition.defaultBaseUrl && <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">BASE URL</label>
                <input type="url" name="base_url" value={baseUrlValue} onChange={(e) => setBaseUrlValue(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20" />
              </div>}

              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">API KEY</label>
                <input 
                  type="password" 
                  name="api_key" 
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  placeholder={editingConfigId ? 'Leave blank to keep the saved key' : 'Your API key (encrypted)'} 
                  required={!editingConfigId}
                  className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                />
                {editingConfigId && <p className="mt-1.5 text-xs text-black/45">Editing existing configuration — leave the key blank to keep the stored one.</p>}
              </div>

              <button
                type="submit"
                disabled={actionLoading === 'llm'}
                className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'llm' ? 'SAVING...' : editingConfigId ? 'SAVE CHANGES' : 'SAVE CONFIGURATION'}
              </button>
            </form>

            {settingsLoading ? (
              <div className="mt-8 p-6 rounded-xl border border-black/[0.07] bg-white">
                <div className="h-3 w-40 bg-black/10 animate-pulse mb-3" />
                <div className="h-3 w-64 bg-black/5 animate-pulse mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-black/5">
                      <div className="size-7 rounded-full bg-black/10 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-black/10 animate-pulse" />
                        <div className="h-2.5 w-24 bg-black/5 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : llmConfigs?.configs?.length ? (
              <div className="mt-8 p-6 rounded-xl border border-black/[0.07] bg-white">
                <h3 className="text-sm font-light tracking-widest mb-3">SAVED API KEYS</h3>
                <p className="text-xs text-black/40 mb-3">
                  The default provider is preferred when running investigations. Mark one as default, or remove it entirely.
                </p>
                <div className="space-y-3">
                  {llmConfigs.configs.map((config: any) => {
                    const isEditing = editingConfigId === config.id
                    const providerDef = PROVIDERS[config.provider]
                    return (
                      <div key={config.id} className={`p-3 rounded-lg ${isEditing ? 'border border-black/10 bg-white' : 'bg-black/5'}`}>
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <ProviderLogo providerId={config.provider} size={24} />
                              <span className="text-sm font-medium">{getProviderBrand(config.provider).name}</span>
                              <span className="text-xs text-black/40">— Editing</span>
                            </div>

                            <div>
                              <label className="mb-1 block text-[10px] tracking-widest text-black/40">MODEL</label>
                              <div className="flex gap-2">
                                <select
                                  value={modelValue}
                                  onChange={(e) => setModelValue(e.target.value)}
                                  className="flex-1 px-3 py-2 rounded-lg border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                                >
                                  {dynamicModels.length > 0 ? (
                                    dynamicModels.map((model) => (
                                      <option key={model.id} value={model.id}>
                                        {model.name} {model.isFree ? '🆓 FREE' : ''}
                                      </option>
                                    ))
                                  ) : (
                                    providerDef?.models.map((model) => (
                                      <option key={model} value={model}>{model}</option>
                                    ))
                                  )}
                                </select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={() => fetchDynamicModels(config.provider)}
                                  disabled={modelsLoading}
                                  title="Refresh models from provider"
                                >
                                  {modelsLoading ? <Spinner className="size-3" /> : <RefreshCw className="size-3" />}
                                </Button>
                              </div>
                            </div>

                            {providerDef?.defaultBaseUrl && (
                              <div>
                                <label className="mb-1 block text-[10px] tracking-widest text-black/40">BASE URL</label>
                                <input
                                  type="url"
                                  value={baseUrlValue}
                                  onChange={(e) => setBaseUrlValue(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                                />
                              </div>
                            )}

                            <div>
                              <label className="mb-1 block text-[10px] tracking-widest text-black/40">API KEY</label>
                              <input
                                type="password"
                                value={apiKeyValue}
                                onChange={(e) => setApiKeyValue(e.target.value)}
                                placeholder="Leave blank to keep the saved key"
                                className="w-full px-3 py-2 rounded-lg border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                              />
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                disabled={actionLoading === 'llm'}
                                onClick={(e) => handleLLMSubmit(e as any)}
                                className="flex-1 px-4 py-2 rounded-lg bg-black text-white text-xs font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === 'llm' ? 'SAVING…' : 'SAVE CHANGES'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingConfigId(null)}
                                className="px-4 py-2 rounded-lg border border-black/10 text-xs font-light tracking-widest hover:bg-black/5 transition-colors"
                              >
                                CANCEL
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <ProviderLogo providerId={config.provider} size={28} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium">{getProviderBrand(config.provider).name}</span>
                                <span className="text-xs text-black/50">{config.model}</span>
                                {config.is_default && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-black text-white text-[10px] tracking-widest">DEFAULT</span>
                                )}
                              </div>
                              {config.maskedKey && <div className="mt-1 font-mono text-xs text-black/40">{config.maskedKey}</div>}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleLLMEditConfig(config)}
                                className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-light tracking-widest hover:bg-black/5 transition-colors"
                              >
                                EDIT
                              </button>
                              {!config.is_default && (
                                <button
                                  type="button"
                                  disabled={actionLoading === `llm-default-${config.id}`}
                                  onClick={() => handleLLMSetDefault(config.id)}
                                  className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-light tracking-widest hover:bg-black/5 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading === `llm-default-${config.id}` ? 'SETTING…' : 'SET DEFAULT'}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={actionLoading === `llm-delete-${config.id}`}
                                onClick={() => handleLLMDeleteConfig(config.id)}
                                className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-light tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === `llm-delete-${config.id}` ? 'REMOVING…' : 'REMOVE'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
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
              {settingsLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-2/3 bg-black/10 animate-pulse" />
                  <div className="h-3 w-1/2 bg-black/5 animate-pulse" />
                  <div className="flex items-center gap-3 pt-2">
                    <div className="size-9 rounded-full bg-black/10 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-black/10 animate-pulse" />
                      <div className="h-2.5 w-20 bg-black/5 animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : githubConfigs?.repos?.length ? (
                <div>
                  <p className="text-sm text-black/60 mb-4">
                    Connected to GitHub. Automatic PR creation and CI integration are enabled for this project.
                  </p>
                  {githubProfile && (
                    <div className="mb-4 flex items-center gap-3 rounded-xl border border-black/[0.07] bg-black/[0.03] px-4 py-3">
                      {githubProfile.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={githubProfile.avatarUrl} alt={githubProfile.login} className="size-9 rounded-full" />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-full bg-black text-sm font-medium text-white">
                          {githubProfile.login?.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{githubProfile.name ?? githubProfile.login}</p>
                        <p className="truncate text-xs text-black/45">@{githubProfile.login}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
                      <CheckCircle2 className="size-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Connected</span>
                    </div>
                    <button
                      type="button"
                      disabled={actionLoading === 'github'}
                      onClick={handleGitHubDisconnect}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                    >
                      <LogOut className="size-4" />
                      {actionLoading === 'github' ? 'Disconnecting…' : 'Disconnect GitHub'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-black/60 mb-4">
                    Connect your GitHub account to enable automatic PR creation and CI integration.
                  </p>
                  <button type="button" disabled={!projectId || actionLoading === 'github-connect'} onClick={async () => {
                    if (!projectId) { return toastError('No project yet', 'Create a project before connecting GitHub.') }
                    setActionLoading('github-connect')
                    toastInfo('Opening GitHub authorization', 'You will be redirected to GitHub to grant repo access.')
                    window.location.href = `/api/github/connect?projectId=${encodeURIComponent(projectId)}`
                  }} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                    <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
                    {actionLoading === 'github-connect' ? 'OPENING GITHUB…' : 'CONNECT GITHUB'}
                  </button>
                </div>
              )}
            </div>

            {githubConfigs?.repos?.length ? (
              <div className="mt-8 p-6 rounded-xl border border-black/[0.07] bg-white">
                <h3 className="text-sm font-light tracking-widest mb-3">TARGET REPOSITORY</h3>
                <p className="text-xs text-black/40 mb-3">
                  Auto-fix PRs and CI integration run against the selected repository.
                </p>
                <select
                  value={githubConfigs.activeConfig ? `${githubConfigs.activeConfig.owner}/${githubConfigs.activeConfig.name}` : ''}
                  disabled={actionLoading === 'repo-switch'}
                  onChange={(e) => {
                    const [owner, name] = e.target.value.split('/')
                    if (owner && name) handleRepoSwitch(owner, name)
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20 disabled:opacity-50"
                >
                  {githubConfigs.repos.map((repo: any) => (
                    <option key={`${repo.owner}/${repo.name}`} value={`${repo.owner}/${repo.name}`}>
                      {repo.owner}/{repo.name}
                    </option>
                  ))}
                </select>
                {actionLoading === 'repo-switch' && (
                  <div className="mt-2 text-xs text-black/40">Switching repository…</div>
                )}
              </div>
            ) : null}

            {githubConfigs?.repos?.length ? (
              <div className="mt-8 p-6 rounded-xl border border-black/[0.07] bg-white">
                <h3 className="text-sm font-light tracking-widest mb-1">AUTOMATION EVENTS</h3>
                <p className="text-xs text-black/40 mb-4">
                  Watch for regressions on every new commit. Each event analyzes the latest commit and opens a fix PR when confidence is high.
                </p>

                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <label className="block text-xs tracking-widest text-black/40 mb-2">EVENT NAME</label>
                    <input
                      name="event-name"
                      placeholder="e.g. Auth regression guard"
                      value={eventForm.name}
                      onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest text-black/40 mb-2">GITHUB ACCOUNT</label>
                    <div className="flex items-center gap-3 rounded-xl border border-black/[0.07] bg-black/[0.03] px-4 py-3">
                      {githubProfile?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={githubProfile.avatarUrl} alt={githubProfile.login} className="size-8 rounded-full" />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full bg-black text-xs font-medium text-white">
                          {githubProfile?.login?.slice(0, 1).toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{githubProfile?.name ?? githubProfile?.login ?? 'Loading GitHub account…'}</p>
                        {githubProfile?.login && <p className="truncate text-xs text-black/45">@{githubProfile.login}</p>}
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-black/40">Repo owner is taken from your GitHub account.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs tracking-widest text-black/40 mb-2">REPO NAME</label>
                      <select
                        name="event-repo"
                        value={eventForm.repoOwner && eventForm.repoName ? `${eventForm.repoOwner}/${eventForm.repoName}` : ''}
                        onChange={(e) => {
                          const [owner, name] = e.target.value.split('/')
                          if (owner && name) setEventForm((f) => ({ ...f, repoOwner: owner, repoName: name }))
                        }}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                      >
                        <option value="" disabled>Select a repository</option>
                        {githubConfigs.repos.map((repo: any) => (
                          <option key={`${repo.owner}/${repo.name}`} value={`${repo.owner}/${repo.name}`}>
                            {repo.owner}/{repo.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs tracking-widest text-black/40 mb-2">BRANCH</label>
                      <input
                        name="event-branch"
                        placeholder="main"
                        value={eventForm.defaultBranch}
                        onChange={(e) => setEventForm((f) => ({ ...f, defaultBranch: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-4">
                    <label className="block text-xs tracking-widest text-black/40 mb-1">FIX / PATCH MODEL</label>
                    <p className="text-xs text-black/45 mb-3">
                      Analyzes the latest commit and generates the fix patch. Prefilled with your default provider. Only providers with a saved API key can be used.
                    </p>
                    <select
                      value={eventForm.fixProvider && eventForm.fixModel ? `${eventForm.fixProvider}|${eventForm.fixModel}` : ''}
                      onChange={(e) => {
                        const [provider, model] = e.target.value.split('|')
                        if (provider && model) setEventForm((f) => ({ ...f, fixProvider: provider, fixModel: model }))
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                    >
                      <option value="" disabled>Select a saved provider + model</option>
                      {savedLlmOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-4">
                    <label className="block text-xs tracking-widest text-black/40 mb-1">COMMIT MESSAGE MODEL</label>
                    <p className="text-xs text-black/45 mb-3">
                      Writes the commit message when the auto-fix PR is opened. Prefilled with your default provider.
                    </p>
                    <select
                      value={eventForm.commitProvider && eventForm.commitModel ? `${eventForm.commitProvider}|${eventForm.commitModel}` : ''}
                      onChange={(e) => {
                        const [provider, model] = e.target.value.split('|')
                        if (provider && model) setEventForm((f) => ({ ...f, commitProvider: provider, commitModel: model }))
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                    >
                      <option value="" disabled>Select a saved provider + model</option>
                      {savedLlmOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="event-trigger-now"
                      type="checkbox"
                      checked={eventForm.triggerNow}
                      onChange={(e) => setEventForm((f) => ({ ...f, triggerNow: e.target.checked }))}
                      className="size-4 accent-black"
                    />
                    <label htmlFor="event-trigger-now" className="text-sm text-black/60">Run analysis immediately on creation</label>
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading === 'event-create'}
                    className="px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'event-create' ? 'CREATING…' : 'CREATE EVENT'}
                  </button>
                </form>

                {events.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <div className="text-xs text-black/40 tracking-widest uppercase mb-1">ALL EVENTS</div>
                    {events.map((event: any) => {
                      const statusTone =
                        event.status === 'completed' ? 'bg-green-100 text-green-700' :
                        event.status === 'analyzing' || event.status === 'running' ? 'bg-amber-100 text-amber-700' :
                        event.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-black/5 text-black/50'
                      return (
                        <div key={event.id} className="p-3 rounded-lg bg-black/5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium truncate">{event.name}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full tracking-widest ${statusTone}`}>{event.status.toUpperCase()}</span>
                              </div>
                              <div className="mt-0.5 text-xs text-black/45 truncate">
                                {event.repo_owner}/{event.repo_name} · {event.default_branch}
                              </div>
                              {event.fix_provider && (
                                <div className="mt-0.5 text-xs text-black/40 truncate">
                                  Fix: {PROVIDERS[event.fix_provider]?.name ?? event.fix_provider} · {event.fix_model}
                                  {event.commit_provider ? ` · Commit msg: ${PROVIDERS[event.commit_provider]?.name ?? event.commit_provider} · ${event.commit_model}` : ''}
                                </div>
                              )}
                              {event.error && <div className="mt-1 text-xs text-red-600">{event.error}</div>}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEventId(editingEventId === event.id ? null : event.id)
                                  setEditingEventModels({
                                    fixProvider: event.fix_provider ?? '',
                                    fixModel: event.fix_model ?? '',
                                    commitProvider: event.commit_provider ?? '',
                                    commitModel: event.commit_model ?? '',
                                  })
                                }}
                                className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-light tracking-widest hover:bg-black/5 transition-colors"
                              >
                                {editingEventId === event.id ? 'CANCEL' : 'EDIT MODELS'}
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === `event-run-${event.id}` || (event.status === 'analyzing' || event.status === 'running')}
                                onClick={() => handleTriggerEvent(event.id)}
                                className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-light tracking-widest hover:bg-black/5 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === `event-run-${event.id}` ? 'RUNNING…' : 'RUN NOW'}
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === `event-delete-${event.id}`}
                                onClick={() => handleDeleteEvent(event.id, event.name)}
                                className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-light tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                DELETE
                              </button>
                            </div>
                          </div>
                          {editingEventId === event.id && (
                            <div className="mt-3 space-y-3 rounded-lg border border-black/10 bg-white p-3">
                              <div>
                                <label className="mb-1.5 block text-[10px] tracking-widest text-black/40">FIX / PATCH MODEL</label>
                                <select
                                  value={editingEventModels.fixProvider && editingEventModels.fixModel ? `${editingEventModels.fixProvider}|${editingEventModels.fixModel}` : ''}
                                  onChange={(e) => {
                                    const [provider, model] = e.target.value.split('|')
                                    if (provider && model) setEditingEventModels((m) => ({ ...m, fixProvider: provider, fixModel: model }))
                                  }}
                                  className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:border-black/20"
                                >
                                  <option value="" disabled>Select a saved provider + model</option>
                                  {savedLlmOptions.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1.5 block text-[10px] tracking-widest text-black/40">COMMIT MESSAGE MODEL</label>
                                <select
                                  value={editingEventModels.commitProvider && editingEventModels.commitModel ? `${editingEventModels.commitProvider}|${editingEventModels.commitModel}` : ''}
                                  onChange={(e) => {
                                    const [provider, model] = e.target.value.split('|')
                                    if (provider && model) setEditingEventModels((m) => ({ ...m, commitProvider: provider, commitModel: model }))
                                  }}
                                  className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:border-black/20"
                                >
                                  <option value="" disabled>Select a saved provider + model</option>
                                  {savedLlmOptions.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={actionLoading === `event-models-${event.id}`}
                                  onClick={() => handleEventModelUpdate(event.id)}
                                  className="px-4 py-2 rounded-lg bg-black text-white text-xs font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading === `event-models-${event.id}` ? 'SAVING…' : 'SAVE MODELS'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEventId(null)}
                                  className="px-4 py-2 rounded-lg border border-black/10 text-xs font-light tracking-widest hover:bg-black/5 transition-colors"
                                >
                                  CANCEL
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
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
                disabled={actionLoading === 'alerts'}
                className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'alerts' ? 'SAVING...' : 'SAVE ALERTS'}
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
                <button type="button" disabled={!projectId || actionLoading === 'apikey'} onClick={handleGenerateKey} className="px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                  {actionLoading === 'apikey' ? 'GENERATING…' : 'GENERATE / REGENERATE KEY'}
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
                          disabled={actionLoading === 'revoke'}
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
                disabled={actionLoading === 'profile'}
                className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'profile' ? 'SAVING...' : 'SAVE PROFILE'}
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
                disabled={actionLoading === 'password'}
                className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'password' ? 'UPDATING...' : 'UPDATE PASSWORD'}
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
                disabled={actionLoading === 'email'}
                className="w-full px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'email' ? 'SENDING...' : 'SEND CONFIRMATION'}
              </button>
            </form>

            <div className="mt-6 p-6 rounded-xl border border-red-300 bg-red-50">
              <h3 className="text-sm font-light tracking-widest text-red-700 mb-2">DELETE ACCOUNT</h3>
              <p className="text-xs text-red-600/80 mb-4">
                Permanently delete your account and all associated projects, API keys, and configurations. This cannot be undone.
              </p>
              <button
                type="button"
                disabled={actionLoading === 'delete'}
                onClick={handleDeleteAccount}
                className="px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-light tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'delete' ? 'DELETING...' : 'DELETE ACCOUNT'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
