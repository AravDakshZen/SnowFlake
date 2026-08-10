'use client'

import React, { useState, useEffect, useRef } from 'react'

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

const STEPS = [
  { n: '01', title: 'Collect', desc: 'Send your error logs via a simple API call. Stack traces, endpoints, status codes — all captured.' },
  { n: '02', title: 'Analyze', desc: 'A 4-pass AI engine scans every file. Critical errors first, security second, logic third, style last.' },
  { n: '03', title: 'Fix', desc: 'Snowflake generates a unified diff patch with confidence scoring. Each fix is verified before commit.' },
  { n: '04', title: 'Ship', desc: 'Auto-create a branch, commit the fix, and open a pull request. CI integration included.' },
]

const DEMO_LINES = [
  { tag: 'INIT', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', msg: 'New error log received — POST /api/checkout returned 500' },
  { tag: 'INIT', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', msg: 'Stack trace captured (42 lines) — queuing investigation' },
  { tag: 'FETCH', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', msg: 'Connecting to GitHub — acme-corp/webapp' },
  { tag: 'FETCH', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', msg: 'Fetching source file: src/services/checkout.ts' },
  { tag: 'PASS 1', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', msg: 'Using Groq / llama3-70b for detection pass' },
  { tag: 'PASS 1', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', msg: 'Primary error — line 42: Null reference on user.cart' },
  { tag: 'PASS 1', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', msg: 'Found 6 additional issues to clean' },
  { tag: 'PASS 2', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', msg: '4 quality improvements applied' },
  { tag: 'PASS 3', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', msg: 'All checks passed — file is production ready' },
  { tag: 'PASS 4', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', msg: '12 lines changed across 2 files' },
  { tag: 'PATCH', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', msg: 'Patch ready — confidence score: 94%' },
  { tag: 'PR', color: 'bg-green-500/10 text-green-400 border-green-500/20', msg: 'Branch created: snowflake/fix-checkout-null-ref' },
  { tag: 'PR', color: 'bg-green-500/10 text-green-400 border-green-500/20', msg: 'Pull request opened: #42' },
  { tag: 'DONE', color: 'bg-green-500/10 text-green-300 border-green-500/20', msg: 'Investigation complete — 7 issues fixed, confidence 94%' },
]

function DemoTerminal() {
  const [visibleLines, setVisibleLines] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= DEMO_LINES.length) {
          if (timerRef.current) clearInterval(timerRef.current)
          setPaused(true)
          setTimeout(() => { setVisibleLines(0); setPaused(false) }, 3000)
          return prev
        }
        return prev + 1
      })
    }, 180)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paused])

  const ts = (i: number) => {
    const d = new Date(Date.now() - (DEMO_LINES.length - i) * 200)
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="rounded-xl border border-black/10 overflow-hidden bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#12121f] border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#FF5F57]" />
          <span className="size-3 rounded-full bg-[#FFBD2E]" />
          <span className="size-3 rounded-full bg-[#28C840]" />
          <span className="ml-3 text-xs text-white/40 font-mono">snowflake@demo: ~/investigation</span>
        </div>
        <span className="text-[11px] text-white/30">{visibleLines}/{DEMO_LINES.length} lines</span>
      </div>
      <div className="h-80 overflow-y-auto p-4 font-mono text-sm">
        {DEMO_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="flex items-start gap-2 py-0.5" style={{ animation: 'fadeUp 0.3s ease both' }}>
            <span className="text-white/25 shrink-0">[{ts(i)}]</span>
            <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border font-mono ${line.color}`}>{line.tag}</span>
            <span className="text-emerald-400/80">{line.msg}</span>
          </div>
        ))}
        <div className="text-emerald-400/60 mt-1">snowflake@demo:~$ <span style={{ animation: 'blink 1s step-end infinite' }}>█</span></div>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  )
}

function InvestigationCard() {
  const { ref, inView } = useInView(0.1)
  return (
    <div ref={ref} className="rounded-2xl border border-black/[0.07] bg-white p-6" style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(28px)', transition: 'all 0.7s ease' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-black/60">Investigation #inv_a3f</span>
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-[10px]">P0</span>
          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 text-[10px]">Completed</span>
        </div>
        <span className="text-xs text-black/40">2 minutes ago</span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-1 rounded-lg bg-black/[0.05] text-xs font-mono">POST /api/checkout</span>
        <span className="px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-mono">500</span>
      </div>
      <p className="text-sm text-black/70 mb-3">Null reference on user.cart before auth check</p>
      <p className="text-xs text-black/50 font-mono mb-4">src/services/checkout.ts</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 rounded-xl bg-black/[0.02] border border-black/[0.04]">
        <div><div className="text-xs text-black/40 mb-1">Confidence</div><div className="text-lg font-light text-green-600">94%</div></div>
        <div><div className="text-xs text-black/40 mb-1">Issues Fixed</div><div className="text-lg font-light">7</div></div>
        <div><div className="text-xs text-black/40 mb-1">Model</div><div className="text-sm font-light">Groq / llama3-70b</div></div>
        <div><div className="text-xs text-black/40 mb-1">PR</div><div className="text-lg font-light text-blue-600">#42</div></div>
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-black/40">Issues:</span>
        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[10px]">3 critical</span>
        <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-[10px]">2 security</span>
        <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 text-[10px]">2 quality</span>
      </div>
      <div className="flex items-center gap-1.5 mb-4">
        {[1,2,3,4].map(n => <span key={n} className="size-5 rounded-full flex items-center justify-center text-[10px] font-medium bg-teal-500 text-white">{n}</span>)}
        <span className="text-xs text-black/40 ml-2">All passes complete</span>
      </div>
      <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#29B5E8] text-white text-sm hover:bg-[#29B5E8]/90 transition-colors">
        View PR #42 on GitHub →
      </a>
    </div>
  )
}

export default function DemoPage() {
  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <a href="/" className="font-pixel text-xs tracking-[0.25em] text-black/50">SnowFlake</a>
          <a href="/" className="text-xs text-black/40 hover:text-black transition-colors">← Back to home</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-12 py-16 space-y-24">
        {/* How it works */}
        <section>
          <div className="mb-12">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] tracking-widest text-black/40 bg-black/[0.04] mb-4">HOW IT WORKS</span>
            <h2 className="text-4xl md:text-5xl font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
              From error to PR<br />in 18 seconds.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.n} className="rounded-2xl border border-black/[0.07] bg-white p-7 min-h-[220px] flex flex-col">
                <span className="font-mono text-[11px] text-black/20 tracking-widest block mb-4">{step.n}</span>
                <h3 className="text-2xl font-light mb-3">{step.title}</h3>
                <p className="text-sm text-black/45 leading-relaxed mt-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live terminal demo */}
        <section>
          <div className="mb-8">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] tracking-widest text-black/40 bg-black/[0.04] mb-4">LIVE DEMO</span>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
              Watch an investigation run.
            </h2>
            <p className="mt-3 text-sm text-black/45 max-w-md">A real investigation streams through 4 passes of AI analysis, then opens a PR with the fix.</p>
          </div>
          <DemoTerminal />
        </section>

        {/* Investigation result */}
        <section>
          <div className="mb-8">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] tracking-widest text-black/40 bg-black/[0.04] mb-4">RESULT</span>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
              The output.
            </h2>
            <p className="mt-3 text-sm text-black/45 max-w-md">Every investigation produces a detailed report with root cause, fix confidence, and an auto-generated PR.</p>
          </div>
          <InvestigationCard />
        </section>

        {/* CTA */}
        <section className="text-center py-16">
          <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-4" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
            Ready to fix your errors?
          </h2>
          <p className="text-sm text-black/45 mb-8">Start free — no credit card required</p>
          <div className="flex items-center justify-center gap-4">
            <a href="/signup" className="rounded-xl bg-[#111] px-7 py-3.5 text-xs tracking-widest text-white transition-colors hover:bg-black/75">GET STARTED</a>
            <a href="/" className="rounded-xl border border-black/10 bg-white/50 px-7 py-3.5 text-xs tracking-widest text-black/60 transition-colors hover:border-black/25 hover:text-black">BACK TO HOME</a>
          </div>
        </section>
      </main>

      <footer className="py-10 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <span className="font-pixel text-xs tracking-[0.25em] text-black/50">SnowFlake</span>
            <p className="mt-2 text-xs text-black/25">Understand what happened. Fix what matters.</p>
          </div>
          <div className="flex items-center gap-6">
            {[{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Docs", href: "/docs" }, { label: "GitHub", href: "https://github.com/AravDakshZen" }].map(l => (
              <a key={l.label} href={l.href} className="text-xs text-black/25 hover:text-black/55 transition-colors tracking-widest">{l.label}</a>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-black/[0.04]">
          <span className="text-xs text-black/20">© 2025 Snowflake. Error detection & automatic fixes.</span>
        </div>
      </footer>
    </div>
  )
}
