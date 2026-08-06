'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { RevealText } from '@/components/reveal-text'
import { PixelIcon } from '@/components/pixel-icon'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('llm')
  const [loading, setLoading] = useState(false)
  
  const { data: llmConfigs } = useSWR('/api/settings/llm', fetcher)
  const { data: alertConfigs } = useSWR('/api/settings/alerts', fetcher)
  const { data: githubConfigs } = useSWR('/api/github/repos', fetcher)
  const { data: apiKey } = useSWR('/api/project/apikey', fetcher)

  const handleLLMSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      provider: formData.get('provider'),
      model: formData.get('model'),
      api_key: formData.get('api_key'),
    }

    try {
      const response = await fetch('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        alert('LLM configuration saved!')
        e.currentTarget.reset()
      }
    } catch (error) {
      alert('Error saving LLM configuration')
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
    }

    try {
      const response = await fetch('/api/settings/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        alert('Alert configuration saved!')
        e.currentTarget.reset()
      }
    } catch (error) {
      alert('Error saving alert configuration')
    } finally {
      setLoading(false)
    }
  }

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
                <label className="block text-xs tracking-widest text-black/40 mb-2">PROVIDER</label>
                <select name="provider" required className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20">
                  <option>openai</option>
                  <option>anthropic</option>
                  <option>google</option>
                  <option>groq</option>
                  <option>openrouter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs tracking-widest text-black/40 mb-2">MODEL</label>
                <input 
                  type="text" 
                  name="model" 
                  placeholder="gpt-4, claude-3-opus, etc." 
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20"
                />
              </div>

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
              <button className="px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors">
                CONNECT GITHUB
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
                {apiKey?.data?.masked_key || 'sf_live_****...'}
              </div>
              <p className="text-xs text-black/40 mb-4">
                Use this key to authenticate API requests from your application.
              </p>
              <button 
                onClick={async () => {
                  const response = await fetch('/api/project/apikey', { method: 'POST' })
                  const data = await response.json()
                  alert('New API key generated. Check your email for the full key.')
                }}
                className="px-6 py-3 rounded-xl bg-black text-white text-sm font-light tracking-widest hover:bg-black/85 transition-colors"
              >
                REGENERATE KEY
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
