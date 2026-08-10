"use client"

import { useEffect, useRef, useState } from "react"

const AGENTS = [
  {
    label: "ERROR DETECTION",
    title: "4-pass AI engine",
    desc: "Detects every bug in your file — not just the crash. Critical errors fixed first, style last.",
    stats: [{ v: "4-pass", l: "AI engine" }, { v: "99.2%", l: "accuracy" }],
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    bgSvg: (
      <svg viewBox="0 0 200 120" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* Crosshair / target detection rings */}
        <circle cx="100" cy="60" r="48" stroke="black" strokeWidth="1" opacity="0.12"/>
        <circle cx="100" cy="60" r="32" stroke="black" strokeWidth="0.8" opacity="0.1"/>
        <circle cx="100" cy="60" r="16" stroke="black" strokeWidth="0.6" opacity="0.08"/>
        <circle cx="100" cy="60" r="4" fill="black" opacity="0.15"/>
        {/* Crosshair lines */}
        <line x1="100" y1="8" x2="100" y2="44" stroke="black" strokeWidth="0.5" opacity="0.1"/>
        <line x1="100" y1="76" x2="100" y2="112" stroke="black" strokeWidth="0.5" opacity="0.1"/>
        <line x1="48" y1="60" x2="84" y2="60" stroke="black" strokeWidth="0.5" opacity="0.1"/>
        <line x1="116" y1="60" x2="152" y2="60" stroke="black" strokeWidth="0.5" opacity="0.1"/>
        {/* Error markers */}
        <circle cx="82" cy="42" r="3" fill="black" opacity="0.08"/>
        <circle cx="118" cy="42" r="3" fill="black" opacity="0.08"/>
        <circle cx="82" cy="78" r="3" fill="black" opacity="0.08"/>
        <circle cx="118" cy="78" r="3" fill="black" opacity="0.08"/>
        {/* Scan line */}
        <line x1="52" y1="60" x2="148" y2="60" stroke="black" strokeWidth="1.5" opacity="0.06" strokeDasharray="2 4"/>
      </svg>
    ),
  },
  {
    label: "GITHUB INTEGRATION",
    title: "Auto PR in 18s",
    desc: "Connects to your repo, fetches source files, commits the fix, and opens a pull request automatically.",
    stats: [{ v: "18s", l: "avg PR time" }, { v: "100%", l: "automated" }],
    icon: (
      <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
      </svg>
    ),
    bgSvg: (
      <svg viewBox="0 0 200 120" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* Branch tree */}
        <line x1="40" y1="60" x2="160" y2="60" stroke="black" strokeWidth="1.2" opacity="0.1"/>
        <line x1="80" y1="60" x2="80" y2="30" stroke="black" strokeWidth="0.8" opacity="0.08"/>
        <line x1="120" y1="60" x2="120" y2="90" stroke="black" strokeWidth="0.8" opacity="0.08"/>
        {/* Commit dots */}
        <circle cx="40" cy="60" r="4" fill="black" opacity="0.15"/>
        <circle cx="80" cy="60" r="4" fill="black" opacity="0.12"/>
        <circle cx="80" cy="30" r="3" fill="black" opacity="0.08"/>
        <circle cx="120" cy="60" r="4" fill="black" opacity="0.12"/>
        <circle cx="120" cy="90" r="3" fill="black" opacity="0.08"/>
        <circle cx="160" cy="60" r="5" stroke="black" strokeWidth="1.5" fill="none" opacity="0.1"/>
        {/* PR arrow */}
        <path d="M140 90 L160 60 L140 30" stroke="black" strokeWidth="0.8" opacity="0.08" fill="none"/>
        {/* Diff lines */}
        <rect x="55" y="24" width="40" height="2" rx="1" fill="black" opacity="0.06"/>
        <rect x="55" y="30" width="30" height="2" rx="1" fill="black" opacity="0.04"/>
        <rect x="135" y="84" width="35" height="2" rx="1" fill="black" opacity="0.06"/>
        <rect x="135" y="90" width="25" height="2" rx="1" fill="black" opacity="0.04"/>
      </svg>
    ),
  },
  {
    label: "MULTI-FILE ANALYSIS",
    title: "Unlimited files",
    desc: "Traces errors across every affected file. Each file gets its own cleaned output and diff.",
    stats: [{ v: "∞", l: "unlimited files" }, { v: "100%", l: "trace coverage" }],
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    bgSvg: (
      <svg viewBox="0 0 200 120" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* Stacked file icons */}
        {[0,1,2,3,4].map(i => (
          <g key={i} transform={`translate(${55 + i * 18}, ${20 + i * 8})`}>
            <rect width="50" height="65" rx="4" stroke="black" strokeWidth={i === 2 ? "1.2" : "0.6"} fill="none" opacity={i === 2 ? 0.15 : 0.06 + i * 0.01}/>
            <rect x="8" y="10" width="24" height="3" rx="1" fill="black" opacity={0.06 + i * 0.01}/>
            <rect x="8" y="18" width="34" height="2" rx="1" fill="black" opacity={0.04 + i * 0.01}/>
            <rect x="8" y="24" width="28" height="2" rx="1" fill="black" opacity={0.03 + i * 0.005}/>
            <rect x="8" y="32" width="30" height="2" rx="1" fill="black" opacity={0.03 + i * 0.005}/>
            <rect x="8" y="40" width="20" height="2" rx="1" fill="black" opacity={0.03 + i * 0.005}/>
          </g>
        ))}
        {/* Connection arrows between files */}
        <path d="M85 55 Q100 45 105 55" stroke="black" strokeWidth="0.6" opacity="0.08" fill="none"/>
        <path d="M105 63 Q120 53 125 63" stroke="black" strokeWidth="0.6" opacity="0.08" fill="none"/>
        <path d="M125 71 Q140 61 145 71" stroke="black" strokeWidth="0.6" opacity="0.08" fill="none"/>
      </svg>
    ),
  },
  {
    label: "LLM FLEXIBILITY",
    title: "8 providers",
    desc: "Use your own API key. OpenAI, Anthropic, Groq, Gemini, NVIDIA, Together, OpenRouter, or Ollama.",
    stats: [{ v: "8", l: "providers" }, { v: "BYO", l: "API key" }],
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><line x1="10" y1="22" x2="14" y2="22"/>
      </svg>
    ),
    bgSvg: (
      <svg viewBox="0 0 200 120" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* Central hub */}
        <circle cx="100" cy="60" r="12" stroke="black" strokeWidth="1" opacity="0.12"/>
        <circle cx="100" cy="60" r="5" fill="black" opacity="0.1"/>
        {/* Provider nodes orbiting */}
        {[0,1,2,3,4,5,6,7].map(i => {
          const angle = (i / 8) * Math.PI * 2
          const r = 40
          const x = 100 + Math.cos(angle) * r
          const y = 60 + Math.sin(angle) * r
          return (
            <g key={i}>
              <line x1="100" y1="60" x2={x} y2={y} stroke="black" strokeWidth="0.5" opacity="0.06"/>
              <rect x={x - 6} y={y - 6} width="12" height="12" rx="3" stroke="black" strokeWidth="0.6" fill="none" opacity="0.08"/>
              <rect x={x - 3} y={y - 1} width="6" height="2" rx="1" fill="black" opacity="0.06"/>
            </g>
          )
        })}
        {/* Outer ring */}
        <circle cx="100" cy="60" r="42" stroke="black" strokeWidth="0.4" opacity="0.06" strokeDasharray="3 5"/>
      </svg>
    ),
  },
]

const STICKY_TOP   = 80
const STICKY_STEP  = 16
const SCALE_STEP   = 0.04
const OFFSET_STEP  = 8

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] tracking-widest font-sans text-black/40 bg-black/[0.04]">
      {children}
    </span>
  )
}

export function StackingAgentCards() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [depth, setDepth] = useState<number[]>(AGENTS.map(() => 0))

  useEffect(() => {
    function onScroll() {
      const nextDepth = AGENTS.map((_, i) => {
        let count = 0
        for (let j = i + 1; j < AGENTS.length; j++) {
          const el = cardRefs.current[j]
          if (!el) continue
          const rect = el.getBoundingClientRect()
          const stickyTopJ = STICKY_TOP + j * STICKY_STEP
          if (rect.top <= stickyTopJ + 2) count++
        }
        return count
      })
      setDepth(nextDepth)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="flex flex-col" style={{ perspective: "1400px", perspectiveOrigin: "50% 0%" }}>
      {AGENTS.map((agent, i) => {
        const d         = depth[i]
        const scale     = 1 - d * SCALE_STEP
        const translateY = d * OFFSET_STEP

        return (
          <div
            key={agent.label}
            ref={el => { cardRefs.current[i] = el }}
            className="sticky mb-4"
            style={{ top: `${STICKY_TOP + i * STICKY_STEP}px`, zIndex: 10 + i }}
          >
            <div
              style={{
                transform:      `scale(${scale}) translateY(${translateY}px)`,
                transformOrigin: "top center",
                transition:     "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
                willChange:     "transform",
              }}
            >
              <div className="group relative bg-[#faf9f7] rounded-2xl border border-black/[0.07] overflow-hidden cursor-pointer">

                {/* Background illustration — subtle, full-card */}
                <div className="absolute inset-0 opacity-100 pointer-events-none">
                  {agent.bgSvg}
                </div>

                {/* Icon at top right */}
                <div className="hidden md:block absolute top-8 right-8 w-12 h-12 rounded-xl border border-black/10 bg-white/50 flex items-center justify-center text-black/30 group-hover:text-black/50 transition-colors" style={{ backdropFilter: "blur(4px)" }}>
                  {agent.icon}
                </div>

                {/* Text content */}
                <div
                  className="relative z-10 p-8"
                  style={{ maxWidth: undefined }}
                >
                  <div className="md:max-w-[60%]">
                    <div className="flex items-start justify-between mb-6">
                      <Tag>{agent.label}</Tag>
                    </div>
                    <h3 className="text-xl font-light mb-3">{agent.title}</h3>
                    <p className="text-sm text-black/45 leading-relaxed mb-8">{agent.desc}</p>
                  </div>
                  <div className="flex gap-8 pt-6 border-t border-black/[0.06]">
                    {agent.stats.map(s => (
                      <div key={s.l}>
                        <div className="text-2xl font-light">{s.v}</div>
                        <div className="text-[11px] text-black/35 tracking-widest mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
