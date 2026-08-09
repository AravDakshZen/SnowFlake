'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'

// Map provider IDs to their logo files in public/logos/
const PROVIDER_LOGOS: Record<string, string> = {
  openai: '/logos/openai_dark.svg',
  anthropic: '/logos/anthropic.svg',
  google: '/logos/gemini.svg',
  gemini: '/logos/gemini.svg',
  nvidia: '/logos/nvidia-icon-dark.svg',
  ollama: '/logos/ollama_dark.svg',
  together: '/logos/togetherai_dark.svg',
  openrouter: '/logos/openrouter_dark.svg',
  cerebras: '/logos/cerebras.svg',
}

interface ProviderOption {
  id: string
  name: string
  description?: string
  isFree?: boolean
}

interface ProviderSelectProps {
  providers: ProviderOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ProviderSelect({ providers, value, onChange, className = '' }: ProviderSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selected = providers.find((p) => p.id === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-black/[0.07] bg-white text-sm focus:outline-none focus:border-black/20 hover:bg-black/[0.02] transition-colors"
      >
        {selected ? (
          <>
            <ProviderLogo providerId={selected.id} size={24} />
            <span className="flex-1 text-left">{selected.name}</span>
            {selected.isFree && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-medium">FREE</span>
            )}
          </>
        ) : (
          <span className="text-black/40">Select provider</span>
        )}
        <ChevronDown className={`size-4 text-black/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-black/[0.07] bg-white shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => {
                  onChange(provider.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-black/[0.03] transition-colors ${
                  provider.id === value ? 'bg-black/[0.05]' : ''
                }`}
              >
                <ProviderLogo providerId={provider.id} size={28} />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    {provider.isFree && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-medium">FREE</span>
                    )}
                  </div>
                  {provider.description && (
                    <p className="text-xs text-black/45 mt-0.5 truncate">{provider.description}</p>
                  )}
                </div>
                {provider.id === value && (
                  <Check className="size-4 text-black/60" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ProviderLogo({ providerId, size = 24 }: { providerId: string; size?: number }) {
  const logoSrc = PROVIDER_LOGOS[providerId]
  
  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt={`${providerId} logo`}
        width={size}
        height={size}
        className="rounded-md object-contain"
        style={{ width: size, height: size }}
      />
    )
  }

  const colors: Record<string, string> = {
    openai: 'bg-[#10a37f]',
    anthropic: 'bg-[#d97757]',
    google: 'bg-[#8a5cf6]',
    nvidia: 'bg-[#76b900]',
    ollama: 'bg-[#222]',
    together: 'bg-[#b91c1c]',
    openrouter: 'bg-[#6466f1]',
    cerebras: 'bg-[#f97316]',
  }
  
  return (
    <div
      className={`flex items-center justify-center rounded-md text-white font-medium ${colors[providerId] || 'bg-black'}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {providerId.charAt(0).toUpperCase()}
    </div>
  )
}
