'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toasts'

const PROVIDERS = [
  { id: 'groq', name: 'Groq', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Recommended for speed' },
  { id: 'google', name: 'Google Gemini Flash', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Google AI Studio key' },
  { id: 'nvidia', name: 'NVIDIA NIM', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Free credits' },
  { id: 'openrouter', name: 'OpenRouter', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Free models available' },
  { id: 'together', name: 'Together AI', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: '$25 free credits' },
  { id: 'ollama', name: 'Ollama', badge: 'FREE', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Local, no key needed' },
  { id: 'openai', name: 'OpenAI', badge: 'PAID', badgeColor: 'bg-gray-100 text-gray-600 border-gray-200', desc: 'GPT-4o, GPT-3.5' },
  { id: 'anthropic', name: 'Anthropic', badge: 'PAID', badgeColor: 'bg-gray-100 text-gray-600 border-gray-200', desc: 'Claude Sonnet, Haiku' },
]

const FAKE_REPOS = [
  { owner: 'acme-corp', name: 'webapp', lang: 'TypeScript', private: true },
  { owner: 'acme-corp', name: 'api-server', lang: 'Python', private: true },
  { owner: 'acme-corp', name: 'docs', lang: 'MDX', private: false },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [providerKey, setProviderKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434')
  const [testResult, setTestResult] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testLatency, setTestLatency] = useState(0)
  const [connected, setConnected] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState('')
  const [repoConnected, setRepoConnected] = useState(false)

  useEffect(() => {
    fetch('/api/project/apikey').then(r => r.json()).then(d => {
      if (d.apiKey) setApiKey(d.apiKey)
      else setApiKey('tw_live_' + 'X'.repeat(32))
    }).catch(() => setApiKey('tw_live_' + 'X'.repeat(32)))
  }, [])

  const copyKey = async () => {
    try { await navigator.clipboard.writeText(apiKey); setCopied(true); toastSuccess('Copied to clipboard'); setTimeout(() => setCopied(false), 2000) } catch { toastError('Copy failed') }
  }

  const testConnection = async () => {
    setTestResult('loading')
    const start = Date.now()
    try {
      const res = await fetch(`/api/settings/llm/test?provider=${selectedProvider}`)
      const latency = Date.now() - start
      if (res.ok) { setTestResult('success'); setTestLatency(latency) } else { setTestResult('error') }
    } catch { setTestResult('error') }
  }

  const connectRepo = (repo: typeof FAKE_REPOS[0]) => {
    setSelectedRepo(`${repo.owner}/${repo.name}`)
    setRepoConnected(true)
  }

  const completeOnboarding = async () => {
    try { await fetch('/api/auth/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ onboardingComplete: true }) }) } catch {}
    router.push('/dashboard')
  }

  const curlSnippet = `curl -X POST https://snowflakedoitforyou.vercel.app/api/logs \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "endpoint": "/api/checkout",
    "method": "POST",
    "statusCode": 500,
    "stackTrace": "TypeError: Cannot read...",
    "projectId": "YOUR_PROJECT_ID"
  }'`

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased flex flex-col">
      {/* Step indicator */}
      <div className="py-8 px-6 flex justify-center">
        <div className="flex items-center gap-3">
          {[1,2,3,4].map(s => (
            <React.Fragment key={s}>
              <div className={`size-8 rounded-full flex items-center justify-center text-sm font-light transition-all ${s === step ? 'bg-[#111] text-white' : s < step ? 'bg-[#111] text-white' : 'bg-black/10 text-black/40'}`}>
                {s < step ? <Check className="size-4" /> : s}
              </div>
              {s < 4 && <div className={`w-12 h-px transition-all ${s < step ? 'bg-[#111]' : 'bg-black/10'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-2xl">
          {/* STEP 1: API Key */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Welcome to Snowflake ❄️</h1>
                <p className="text-sm text-black/45 max-w-md mx-auto">Your project API key lets you send error logs to Snowflake from any backend. Keep it safe.</p>
              </div>

              <div className="rounded-xl border border-black/[0.07] bg-white p-6">
                <label className="mb-2 block text-xs tracking-widest text-black/40">PROJECT API KEY</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 rounded-lg bg-[#1a1a2e] font-mono text-sm text-emerald-400/80 overflow-x-auto">{apiKey}</div>
                  <Button variant="outline" size="icon" onClick={copyKey}>{copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}</Button>
                </div>
                <p className="mt-3 text-xs text-amber-600 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-amber-500" /> This key is shown once. Copy it now.
                </p>
              </div>

              <div className="rounded-xl border border-black/[0.07] bg-white p-6">
                <label className="mb-2 block text-xs tracking-widest text-black/40">CURL EXAMPLE</label>
                <pre className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-xs text-emerald-400/80 overflow-x-auto whitespace-pre-wrap">{curlSnippet}</pre>
              </div>

              <Button onClick={() => setStep(2)} className="w-full h-12" disabled={!copied && apiKey !== 'tw_live_' + 'X'.repeat(32)}>
                I&apos;ve copied my key → Continue <ArrowRight className="ml-2 size-4" />
              </Button>
              {apiKey === 'tw_live_' + 'X'.repeat(32) && (
                <Button onClick={() => setStep(2)} variant="ghost" className="w-full text-black/40">Skip for now →</Button>
              )}
            </div>
          )}

          {/* STEP 2: LLM Provider */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Connect your AI engine</h1>
                <p className="text-sm text-black/45 max-w-md mx-auto">Snowflake uses your own API key to analyze errors. Your key is encrypted and never shared.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => { setSelectedProvider(p.id); setProviderKey(''); setTestResult('idle'); setBaseUrl(p.id === 'ollama' ? 'http://localhost:11434' : '') }}
                    className={`p-4 rounded-xl border text-left transition-all ${selectedProvider === p.id ? 'border-[#111] bg-white shadow-sm' : 'border-black/[0.07] bg-white/50 hover:border-black/15'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{p.name}</span>
                      <Badge variant="outline" className={`text-[9px] ${p.badgeColor}`}>{p.badge}</Badge>
                    </div>
                    <span className="text-[11px] text-black/40">{p.desc}</span>
                  </button>
                ))}
              </div>

              {selectedProvider && (
                <div className="rounded-xl border border-black/[0.07] bg-white p-6 space-y-4">
                  {selectedProvider === 'ollama' ? (
                    <div>
                      <label className="mb-2 block text-xs tracking-widest text-black/40">BASE URL</label>
                      <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="http://localhost:11434" />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-xs tracking-widest text-black/40">API KEY</label>
                      <div className="relative">
                        <Input type={showKey ? 'text' : 'password'} value={providerKey} onChange={e => setProviderKey(e.target.value)} placeholder="Enter your API key" className="pr-10" />
                        <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60">
                          {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <Button variant="outline" onClick={testConnection} disabled={testResult === 'loading'}>
                    {testResult === 'loading' ? <><Loader2 className="size-4 mr-2 animate-spin" /> Testing...</> :
                     testResult === 'success' ? <><Check className="size-4 mr-2 text-green-500" /> Connected · {testLatency}ms</> :
                     testResult === 'error' ? <span className="text-red-500">Connection failed</span> :
                     'Test connection'}
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-2 size-4" /> Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Save and continue → <ArrowRight className="ml-2 size-4" /></Button>
              </div>
            </div>
          )}

          {/* STEP 3: GitHub */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Connect your GitHub repo</h1>
                <p className="text-sm text-black/45 max-w-md mx-auto">Snowflake reads your source files to understand and fix the errors it detects.</p>
              </div>

              {!connected ? (
                <Button onClick={() => setConnected(true)} className="w-full h-12" variant="outline">
                  <svg viewBox="0 0 16 16" className="size-4 fill-current mr-2"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
                  Connect GitHub
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                    <Check className="size-4" /> GitHub connected
                  </div>
                  {FAKE_REPOS.map(repo => (
                    <button key={`${repo.owner}/${repo.name}`} onClick={() => connectRepo(repo)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${selectedRepo === `${repo.owner}/${repo.name}` ? 'border-[#111] bg-white' : 'border-black/[0.07] bg-white/50 hover:border-black/15'}`}>
                      <div>
                        <span className="text-sm font-medium">{repo.owner}/{repo.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-black/40">{repo.lang}</span>
                          {repo.private && <Badge variant="outline" className="text-[9px]">Private</Badge>}
                        </div>
                      </div>
                      {selectedRepo === `${repo.owner}/${repo.name}` && <Check className="size-4 text-green-500" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-2 size-4" /> Back</Button>
                <Button onClick={() => setStep(4)} className="flex-1">Continue → <ArrowRight className="ml-2 size-4" /></Button>
              </div>
            </div>
          )}

          {/* STEP 4: Ready */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Snowflake is ready ❄️</h1>
              </div>

              <div className="rounded-xl border border-black/[0.07] bg-white p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm"><Check className="size-4 text-green-500" /> API key copied</div>
                <div className="flex items-center gap-2 text-sm">
                  {selectedProvider ? <><Check className="size-4 text-green-500" /> {PROVIDERS.find(p => p.id === selectedProvider)?.name} connected</> : <><span className="size-4 rounded-full border border-black/20" /> No provider — add one in Settings</>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {repoConnected ? <><Check className="size-4 text-green-500" /> {selectedRepo} connected</> : <><span className="size-4 rounded-full border border-black/20" /> No repo yet — connect one in Settings</>}
                </div>
              </div>

              <div className="rounded-xl border border-black/[0.07] bg-white p-6">
                <label className="mb-2 block text-xs tracking-widest text-black/40">SEND YOUR FIRST ERROR LOG</label>
                <pre className="bg-[#1a1a2e] rounded-lg p-4 font-mono text-xs text-emerald-400/80 overflow-x-auto whitespace-pre-wrap">{curlSnippet}</pre>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="mr-2 size-4" /> Back</Button>
                <Button onClick={completeOnboarding} className="flex-1 h-12">Open dashboard → <ArrowRight className="ml-2 size-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
