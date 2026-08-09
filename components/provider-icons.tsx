'use client'

// Brand-accurate SVG marks for every supported LLM provider.
// Each mark is drawn to fit a 1x1 viewBox so it scales cleanly inside
// rounded "chip" containers (see <ProviderChip />).

export function OpenAIIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M22.282 9.821a5.985 5.985 0 0 0-.515-4.076 6.01 6.01 0 0 0-5.882-3.66 6.002 6.002 0 0 0-5.044 2.853l-.248.38-.277.43-.326.505a6.012 6.012 0 0 0-4.342 3.783A6.002 6.002 0 0 0 3.9 18.57a5.985 5.985 0 0 0 4.855 1.8 6.01 6.01 0 0 0 5.274 1.925 6.003 6.003 0 0 0 4.182-2.637l.249-.38.277-.43.326-.505a6.012 6.012 0 0 0 3.22-6.523z"
        fill="currentColor"
      />
      <path
        d="M15.102 15.168c-1.807.11-3.53.117-5.147.022l-.395-.028-.498-.045c-.55-.053-1.094-.16-1.623-.32-.05-.44-.08-.888-.08-1.343 0-3.11 1.905-5.78 4.64-6.976.37 2.403.786 3.72.786 3.72-.56-1.083-.968-2.394-.968-2.394 2.823 1.26 4.935 4.11 4.935 7.028 0 .276-.017.548-.05.816a5.954 5.954 0 0 1-2.585.52z"
        fill="#fff"
        fillOpacity="0.9"
      />
    </svg>
  )
}

export function AnthropicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      {/* Claude starburst — 12 radiating spokes */}
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 2.4v3" />
        <path d="M12 18.6v3" />
        <path d="M2.4 12h3" />
        <path d="M18.6 12h3" />
        <path d="m5.1 5.1 2.1 2.1" />
        <path d="m16.8 16.8 2.1 2.1" />
        <path d="m18.9 5.1-2.1 2.1" />
        <path d="m7.2 16.8-2.1 2.1" />
      </g>
    </svg>
  )
}

export function GeminiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="gem-grad" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#4b63dd" />
          <stop offset="50%" stopColor="#8a5cf6" />
          <stop offset="100%" stopColor="#d0487f" />
        </linearGradient>
      </defs>
      <g fill="url(#gem-grad)">
        <path d="M12 0c.6 4.1 2.6 6.6 5.2 7.5-2.6.9-4.6 3.4-5.2 7.5-.6-4.1-2.6-6.6-5.2-7.5 2.6-.9 4.6-3.4 5.2-7.5Z" />
        <path d="M19.8 12c.3 2.2 1.4 3.5 2.8 4-1.4.5-2.5 1.8-2.8 4-.3-2.2-1.4-3.5-2.8-4 1.4-.5 2.5-1.8 2.8-4Z" />
        <path d="M4.2 16c.2 1.7 1 2.6 2 3-1 .4-1.8 1.3-2 3-.2-1.7-1-2.6-2-3 1-.4 1.8-1.3 2-3Z" />
      </g>
    </svg>
  )
}

export function NvidiaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M3.5 8.2c2.2-2.2 5.6-3.2 9.6-3.2 4.1 0 7.6 1.1 9.6 3.2.5.5.5 1.3 0 1.8l-1.4 1.4c-1.8-1.5-4.6-2.3-7.6-2.3-3 0-5.8.8-7.6 2.3l-1.4-1.4c-.5-.5-.5-1.3 0-1.8ZM6.6 11.3c1.6-1.5 3.9-2.2 6.6-2.2 2.7 0 5 .7 6.6 2.2.5.5.5 1.3 0 1.8l-1.2 1.2c-1.2-1-3-1.6-5.4-1.6-2.4 0-4.2.6-5.4 1.6l-1.2-1.2c-.5-.5-.5-1.3 0-1.8ZM9.8 14.3c1-.8 2.4-1.2 3.9-1.2 1.5 0 2.9.4 3.9 1.2.5.4.5 1.2 0 1.7l-3.9 3.5-3.9-3.5c-.5-.5-.5-1.3 0-1.7Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function OllamaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      {/* Simplified llama head */}
      <g fill="currentColor">
        <rect x="4.5" y="12" width="4.5" height="4.5" rx="1" />
        <rect x="15" y="12" width="4.5" height="4.5" rx="1" />
        <path d="M12 6c3.6 0 6 2.2 6 5.4 0 2.4-1.2 4.4-3 5.5h-6c-1.8-1.1-3-3.1-3-5.5C6 8.2 8.4 6 12 6Z" />
        <circle cx="10" cy="10.6" r="1.1" fill="#fff" />
        <circle cx="14" cy="10.6" r="1.1" fill="#fff" />
        <path d="M12 12.8c.5 0 1 .3 1.3.8h-2.6c.3-.5.8-.8 1.3-.8Z" fill="#fff" />
      </g>
    </svg>
  )
}

export function TogetherIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 3c4.1 0 6.5 1.6 7.3 4.8.2.8-.4 1.5-1.2 1.5H5.9c-.8 0-1.4-.7-1.2-1.5C5.5 4.6 7.9 3 12 3Z"
        fill="currentColor"
      />
      <path
        d="M12 9.2c4.1 0 6.5 1.6 7.3 4.8.2.8-.4 1.5-1.2 1.5H5.9c-.8 0-1.4-.7-1.2-1.5.8-3.2 3.2-4.8 7.3-4.8Z"
        fill="currentColor"
        fillOpacity="0.75"
      />
      <path
        d="M12 15.4c4.1 0 6.5 1.6 7.3 4.8.2.8-.4 1.5-1.2 1.5H5.9c-.8 0-1.4-.7-1.2-1.5.8-3.2 3.2-4.8 7.3-4.8Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
    </svg>
  )
}

export function OpenRouterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect x="2.5" y="8" width="19" height="8" rx="2" fill="currentColor" />
      <circle cx="7" cy="12" r="1.6" fill="#fff" />
      <circle cx="12" cy="12" r="1.6" fill="#fff" />
      <circle cx="17" cy="12" r="1.6" fill="#fff" />
    </svg>
  )
}

export function CerebrasIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
      <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="currentColor"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  )
}

// ── Provider → icon + brand color ─────────────────────────────────────────────

const BRAND: Record<string, { name: string; color: string; fg?: string; mark: (c: string) => React.ReactNode }> = {
  openai: { name: 'OpenAI', color: '#10a37f', mark: (c) => <OpenAIIcon className={c} /> },
  anthropic: { name: 'Anthropic', color: '#d97757', mark: (c) => <AnthropicIcon className={c} /> },
  google: { name: 'Google Gemini', color: '#8a5cf6', mark: (c) => <GeminiIcon className={c} /> },
  gemini: { name: 'Google Gemini', color: '#8a5cf6', mark: (c) => <GeminiIcon className={c} /> },
  nvidia: { name: 'NVIDIA NIM', color: '#76b900', mark: (c) => <NvidiaIcon className={c} /> },
  ollama: { name: 'Ollama', color: '#222', mark: (c) => <OllamaIcon className={c} /> },
  together: { name: 'Together AI', color: '#b91c1c', mark: (c) => <TogetherIcon className={c} /> },
  openrouter: { name: 'OpenRouter', color: '#6466f1', mark: (c) => <OpenRouterIcon className={c} /> },
  cerebras: { name: 'Cerebras', color: '#f97316', mark: (c) => <CerebrasIcon className={c} /> },
}

export function getProviderBrand(providerId: string) {
  return BRAND[providerId.toLowerCase()] ?? {
    name: providerId,
    color: '#111',
    mark: (c: string) => <span className={`flex items-center justify-center font-bold text-white ${c}`}>?</span>,
  }
}

/** Round colored chip with the provider's brand mark centered. */
export function ProviderChip({
  providerId,
  size = 32,
  className = '',
}: {
  providerId: string
  size?: number
  className?: string
}) {
  const brand = getProviderBrand(providerId)
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-lg text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: brand.color }}
    >
      <span className="block" style={{ width: Math.round(size * 0.6), height: Math.round(size * 0.6) }}>
        {brand.mark('w-full h-full')}
      </span>
    </span>
  )
}
