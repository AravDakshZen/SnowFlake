import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { OPENAI_COMPAT_BASE_URLS, OPENAI_COMPAT_PROVIDERS } from '@/lib/llm'

interface ModelInfo {
  id: string
  name: string
  isFree: boolean
  contextLength?: number
  description?: string
}

const MODEL_CACHE = new Map<string, { models: ModelInfo[]; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

async function fetchOpenAICompatibleModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`)
  }

  const data = await response.json()
  const models = data.data || data.models || []

  return models.map((m: any) => ({
    id: m.id,
    name: m.id,
    isFree: detectFreeModel(m.id, baseUrl),
    contextLength: m.context_length,
    description: m.description,
  }))
}

function detectFreeModel(modelId: string, baseUrl: string): boolean {
  const hostname = new URL(baseUrl).hostname

  if (hostname.includes('cerebras')) return true
  if (hostname.includes('nvidia')) return true

  return false
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`)
  }

  const data = await response.json()
  return data.data.map((m: any) => ({
    id: m.id,
    name: m.id,
    isFree: false,
    contextLength: undefined,
    description: undefined,
  }))
}

async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`)
  }

  const data = await response.json()
  return (data.models || []).map((m: any) => ({
    id: m.name.replace('models/', ''),
    name: m.displayName || m.name.replace('models/', ''),
    isFree: m.name.includes('flash'),
    contextLength: m.inputTokenLimit,
    description: m.description,
  }))
}

async function fetchTogetherModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch('https://api.together.xyz/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`)
  }

  const data = await response.json()
  return (data.data || []).map((m: any) => ({
    id: m.id,
    name: m.display_name || m.id,
    isFree: m.pricing?.prompt === '0' || m.pricing?.completion === '0',
    contextLength: m.context_length,
    description: m.description,
  }))
}

async function fetchOpenRouterModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`)
  }

  const data = await response.json()
  return (data.data || []).map((m: any) => ({
    id: m.id,
    name: m.name || m.id,
    isFree: m.pricing?.prompt === '0' && m.pricing?.completion === '0',
    contextLength: m.context_length,
    description: m.description,
  }))
}

async function fetchNvidiaModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`)
  }

  const data = await response.json()
  return (data.data || []).map((m: any) => ({
    id: m.id,
    name: m.id,
    isFree: true,
    contextLength: m.context_length,
    description: m.description,
  }))
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const apiKey = searchParams.get('apiKey')

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }

    const cacheKey = `${provider}:${apiKey ? 'auth' : 'noauth'}`
    const cached = MODEL_CACHE.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ models: cached.models })
    }

    let models: ModelInfo[] = []

    if (!apiKey && OPENAI_COMPAT_PROVIDERS.has(provider)) {
      const baseUrl = OPENAI_COMPAT_BASE_URLS[provider]
      if (baseUrl) {
        models = await fetchOpenAICompatibleModels(baseUrl, '')
      }
    } else if (apiKey) {
      switch (provider) {
        case 'openai':
          models = await fetchOpenAIModels(apiKey)
          break
        case 'google':
        case 'gemini':
          models = await fetchGeminiModels(apiKey)
          break
        case 'together':
          models = await fetchTogetherModels(apiKey)
          break
        case 'openrouter':
          models = await fetchOpenRouterModels(apiKey)
          break
        case 'nvidia':
          models = await fetchNvidiaModels(apiKey)
          break
        case 'cerebras': {
          const baseUrl = OPENAI_COMPAT_BASE_URLS[provider]
          if (baseUrl) {
            models = await fetchOpenAICompatibleModels(baseUrl, apiKey)
          }
          break
        }
        default:
          return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
      }
    }

    models.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1
      if (!a.isFree && b.isFree) return 1
      return a.name.localeCompare(b.name)
    })

    MODEL_CACHE.set(cacheKey, { models, timestamp: Date.now() })

    return NextResponse.json({ models })
  } catch (error) {
    console.error('[v0] Models fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models', models: [] },
      { status: 500 }
    )
  }
}