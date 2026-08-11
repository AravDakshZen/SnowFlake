'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Copy, Check, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, ExternalLink, Github } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toasts'
import { ProviderLogo } from '@/components/provider-select'
import { PROVIDERS } from '@/lib/llm'

const ONBOARDING_PROVIDERS = [
  { id: 'groq', name: 'Groq', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Recommended for speed' },
  { id: 'google', name: 'Google Gemini', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Google AI Studio key' },
  { id: 'nvidia', name: 'NVIDIA NIM', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Free credits' },
  { id: 'openrouter', name: 'OpenRouter', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Free models available' },
  { id: 'together', name: 'Together AI', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: '$25 free credits' },
  { id: 'ollama', name: 'Ollama', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Local, no key needed' },
  { id: 'openai', name: 'OpenAI', badge: 'PAID', badgeColor: 'bg-gray-100 text-gray-600 border-gray-200', desc: 'GPT-4o, GPT-5' },
  { id: 'anthropic', name: 'Anthropic', badge: 'PAID', badgeColor: 'bg-gray-100 text-gray-600 border-gray-200', desc: 'Claude Sonnet, Haiku' },
]

const KEY_PLACEHOLDERS: Record<string, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  google: 'AIza...',
  groq: 'gsk_...',
  nvidia: 'nvapi-...',
  openrouter: 'sk-or-...',
  together: '...',
  ollama: '',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [providerKey, setProviderKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [testResult, setTestResult] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testLatency, setTestLatency] = useState(0)
  const [testError, setTestError] = useState('')
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const savedStep = localStorage.getItem('onboarding_step')
    if (savedStep) {
      const s = parseInt(savedStep, 10)
      if (s >= 1 && s <= 4) setStep(s)
    }
  }, [])

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('onboarding_step', step.toString())
    }
  }, [step, loaded])

  useEffect(() => {
    fetch('/api/project/current')
      .then(r => r.json())
      .then(async d => {
        if (d.project?.id) {
          setProjectId(d.project.id)
          const [apikeyRes, githubRes] = await Promise.all([
            fetch(`/api/project/apikey?projectId=${d.project.id}`).then(r => r.json()).catch(() => null),
            fetch(`/api/github/repos?projectId=${d.project.id}`).then(r => r.json()).catch(() => null),
          ])
          if (apikeyRes?.keys?.[0]) {
            setApiKey(apikeyRes.keys[0].maskedKey)
          } else {
            setApiKey('snow_live_' + 'X'.repeat(32))
          }
          if (githubRes && !githubRes.error) {
            setGithubConnected(true)
          }
        } else {
          setApiKey('snow_live_' + 'X'.repeat(32))
        }
        setLoaded(true)
      })
      .catch(() => {
        setApiKey('snow_live_' + 'X'.repeat(32))
        setLoaded(true)
      })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const githubStatus = params.get('github')
    if (githubStatus === 'connected') {
      setGithubConnected(true)
      toastSuccess('GitHub connected successfully')
      window.history.replaceState({}, '', '/onboarding')
    } else if (githubStatus === 'cancelled') {
      toastError('GitHub authorization cancelled')
      window.history.replaceState({}, '', '/onboarding')
    } else if (githubStatus === 'failed') {
      toastError('GitHub connection failed')
      window.history.replaceState({}, '', '/onboarding')
    }
  }, [])

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      toastSuccess('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toastError('Copy failed')
    }
  }

  const testConnection = async () => {
    if (!selectedProvider) return
    setTestResult('loading')
    setTestError('')
    const start = Date.now()
    try {
      const res = await fetch('/api/settings/llm/test-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: providerKey || undefined,
          model: selectedModel || PROVIDERS[selectedProvider]?.models[0] || '',
          baseUrl: baseUrl || PROVIDERS[selectedProvider]?.defaultBaseUrl || '',
        }),
      })
      const data = await res.json()
      const latency = Date.now() - start
      if (res.ok) {
        setTestResult('success')
        setTestLatency(latency)
      } else {
        setTestResult('error')
        setTestError(data.error || 'Connection failed')
      }
    } catch {
      setTestResult('error')
      setTestError('Network error — please try again')
    }
  }

  const connectGitHub = async () => {
    setGithubLoading(true)
    try {
      const res = await fetch('/api/project/current')
      const data = await res.json()
      const pid = data?.project?.id
      if (pid) {
        window.location.href = `/api/github/connect?projectId=${pid}&from=onboarding`
      }
    } catch {
      setGithubLoading(false)
      toastError('Failed to start GitHub connection')
    }
  }

  const completeOnboarding = async () => {
    try {
      await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingComplete: true }),
      })
    } catch {}
    router.push('/dashboard')
  }

  const saveProviderConfig = async () => {
    if (!selectedProvider) return
    try {
      await fetch('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel || PROVIDERS[selectedProvider]?.models[0] || '',
          api_key: providerKey || undefined,
          base_url: baseUrl || PROVIDERS[selectedProvider]?.defaultBaseUrl || '',
          project_id: projectId,
        }),
      })
    } catch {}
  }

  const currentProviderDef = selectedProvider ? PROVIDERS[selectedProvider] : null
  const placeholder = KEY_PLACEHOLDERS[selectedProvider] || 'Your API key'

  return (
    <div className="bg-[#F5F4F0] text-[#111] h-screen font-sans antialiased flex flex-col overflow-hidden">
      {/* Snowflake Logo Header */}
      <div className="py-6 px-6 flex justify-center shrink-0">
        <div className="flex items-center gap-2">
          <svg className="size-8" viewBox="0 0 100 100" fill="none">
            <path d="M50 5 L58 35 L90 35 L64 55 L72 85 L50 65 L28 85 L36 55 L10 35 L42 35 Z" fill="#29B5E8" />
            <circle cx="50" cy="50" r="12" fill="white" />
            <circle cx="50" cy="50" r="8" fill="#29B5E8" />
          </svg>
          <span className="text-lg font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
            Snowflake
          </span>
        </div>
      </div>

      {/* Step indicator */}
      <div className="py-4 px-6 flex justify-center shrink-0">
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4].map(s => (
            <React.Fragment key={s}>
              <div className={`size-8 rounded-full flex items-center justify-center text-sm font-light transition-all ${s === step ? 'bg-[#111] text-white' : s < step ? 'bg-[#111] text-white' : 'bg-black/10 text-black/40'}`}>
                {s < step ? <Check className="size-4" /> : s}
              </div>
              {s < 4 && <div className={`w-12 h-px transition-all ${s < step ? 'bg-[#111]' : 'bg-black/10'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-16 overflow-y-auto">
        <div className="w-full max-w-2xl">
          {/* STEP 1: API Key */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3 text-[#111]" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Welcome to Snowflake</h1>
                <p className="text-sm text-[#555] max-w-md mx-auto">Your project API key lets you send error logs to Snowflake from any backend. Keep it safe.</p>
              </div>

              <Card className="border-black/[0.07] bg-white">
                <CardContent className="p-6">
                  <label className="mb-2 block text-xs tracking-widest text-[#666]">PROJECT API KEY</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 rounded-lg bg-[#1a1a2e] font-mono text-sm text-emerald-400/80 overflow-x-auto">{apiKey}</div>
                    <Button variant="outline" size="icon" onClick={copyKey}>{copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}</Button>
                  </div>
                  <p className="mt-3 text-xs text-amber-600 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-amber-500" /> This key is shown once. Copy it now.
                  </p>
                </CardContent>
              </Card>

              <Button onClick={() => setStep(2)} className="w-full h-12">
                Continue <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          )}

          {/* STEP 2: LLM Provider */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3 text-[#111]" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Connect your AI engine</h1>
                <p className="text-sm text-[#555] max-w-md mx-auto">Snowflake uses your own API key to analyze errors. Your key is encrypted and never shared.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ONBOARDING_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProvider(p.id)
                      setProviderKey('')
                      setSelectedModel(PROVIDERS[p.id]?.models[0] || '')
                      setTestResult('idle')
                      setBaseUrl(PROVIDERS[p.id]?.defaultBaseUrl || '')
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${selectedProvider === p.id ? 'border-[#111] bg-white shadow-sm' : 'border-black/[0.07] bg-white/50 hover:border-black/15'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ProviderLogo providerId={p.id} size={20} />
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[9px] ${p.badgeColor}`}>{p.badge}</Badge>
                      <span className="text-[11px] text-[#666]">{p.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedProvider && currentProviderDef && (
                <Card className="border-black/[0.07] bg-white">
                  <CardContent className="p-6 space-y-4">
                    {/* Model selector */}
                    <div>
                      <label className="mb-2 block text-xs tracking-widest text-[#666]">MODEL</label>
                      <select
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                      >
                        {currentProviderDef.models.map(model => (
                          <option key={model} value={model}>
                            {model}{currentProviderDef.modelDetails?.[model]?.context ? ` (${currentProviderDef.modelDetails[model].context})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* API Key or Base URL */}
                    {selectedProvider === 'ollama' ? (
                      <div>
                        <label className="mb-2 block text-xs tracking-widest text-[#666]">API KEY</label>
                        <div className="relative">
                          <Input
                            type={showKey ? 'text' : 'password'}
                            value={providerKey}
                            onChange={e => setProviderKey(e.target.value)}
                            placeholder="Get your key at ollama.com/settings/keys"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#333]"
                          >
                            {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        <p className="mt-1.5 text-xs text-[#888]">Required for Ollama cloud models</p>
                      </div>
                    ) : (
                      <div>
                        <label className="mb-2 block text-xs tracking-widest text-[#666]">API KEY</label>
                        <div className="relative">
                          <Input
                            type={showKey ? 'text' : 'password'}
                            value={providerKey}
                            onChange={e => setProviderKey(e.target.value)}
                            placeholder={placeholder}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#333]"
                          >
                            {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Test connection */}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={testConnection}
                        disabled={testResult === 'loading' || !providerKey}
                      >
                        {testResult === 'loading' ? (
                          <><Loader2 className="size-4 mr-2 animate-spin" /> Testing...</>
                        ) : testResult === 'success' ? (
                          <><Check className="size-4 mr-2 text-green-500" /> Connected · {testLatency}ms</>
                        ) : testResult === 'error' ? (
                          <span className="text-red-500">Connection failed</span>
                        ) : (
                          'Test connection'
                        )}
                      </Button>
                      {testResult === 'error' && testError && (
                        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{testError}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-2 size-4" /> Back</Button>
                <Button
                  onClick={async () => {
                    await saveProviderConfig()
                    setStep(3)
                  }}
                  className="flex-1"
                >
                  {testResult === 'success' ? 'Continue' : 'Skip for now'} <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: GitHub */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3 text-[#111]" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Connect your GitHub repo</h1>
                <p className="text-sm text-[#555] max-w-md mx-auto">Snowflake reads your source files to understand and fix the errors it detects.</p>
              </div>

              <Card className="border-black/[0.07] bg-white">
                <CardContent className="p-6">
                  {!githubConnected ? (
                    <div className="text-center space-y-4">
                      <div className="mx-auto size-16 rounded-full bg-[#24292f] flex items-center justify-center">
                        <Github className="size-8 text-white" />
                      </div>
                      <p className="text-sm text-[#666]">
                        Connect your GitHub account to enable automatic PR creation and CI integration.
                      </p>
                      <Button
                        onClick={connectGitHub}
                        className="w-full h-12 bg-[#24292f] hover:bg-[#1a1f23] text-white"
                        disabled={githubLoading}
                      >
                        {githubLoading ? (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                          <Github className="size-4 mr-2" />
                        )}
                        {githubLoading ? 'Connecting...' : 'Connect GitHub'}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="mx-auto size-16 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="size-8 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-700">GitHub connected!</p>
                        <p className="text-sm text-[#666] mt-1">Good to go — Snowflake can now read your source files and create fix PRs.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-2 size-4" /> Back</Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  {githubConnected ? 'Continue' : 'Skip for now'} <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Ready */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="mx-auto size-16 rounded-full bg-[#29B5E8]/10 flex items-center justify-center mb-4">
                  <svg className="size-8" viewBox="0 0 100 100" fill="none">
                    <path d="M50 5 L58 35 L90 35 L64 55 L72 85 L50 65 L28 85 L36 55 L10 35 L42 35 Z" fill="#29B5E8" />
                    <circle cx="50" cy="50" r="12" fill="white" />
                    <circle cx="50" cy="50" r="8" fill="#29B5E8" />
                  </svg>
                </div>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3 text-[#111]" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Snowflake is ready</h1>
                <p className="text-sm text-[#555] max-w-md mx-auto">You're all set to start monitoring and fixing errors automatically.</p>
              </div>

              <Card className="border-black/[0.07] bg-white">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="size-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="size-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[#111]">API key copied</p>
                      <p className="text-xs text-[#666]">Ready to receive error logs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`size-8 rounded-full flex items-center justify-center ${selectedProvider ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {selectedProvider ? (
                        <Check className="size-4 text-green-600" />
                      ) : (
                        <span className="size-3 rounded-full border-2 border-[#ccc]" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#111]">
                        {selectedProvider ? (
                          <>{ONBOARDING_PROVIDERS.find(p => p.id === selectedProvider)?.name} connected</>
                        ) : (
                          'No provider — add one in Settings'
                        )}
                      </p>
                      <p className="text-xs text-[#666]">
                        {selectedProvider ? 'AI analysis ready' : 'Configure an LLM provider'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`size-8 rounded-full flex items-center justify-center ${githubConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {githubConnected ? (
                        <Check className="size-4 text-green-600" />
                      ) : (
                        <span className="size-3 rounded-full border-2 border-[#ccc]" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#111]">
                        {githubConnected ? 'GitHub connected' : 'No repo yet — connect one in Settings'}
                      </p>
                      <p className="text-xs text-[#666]">
                        {githubConnected ? 'Auto-fix PRs enabled' : 'Source code access for debugging'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="mr-2 size-4" /> Back</Button>
                <Button onClick={completeOnboarding} className="flex-1 h-12 bg-[#29B5E8] hover:bg-[#2196cc] text-white">
                  Open dashboard <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
