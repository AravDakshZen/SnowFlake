'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck, Github, Chrome, ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function AuthShell({
  children,
  title,
  eyebrow,
  description,
  mode = 'signin',
}: {
  children: ReactNode
  title: string
  eyebrow: string
  description: string
  mode?: 'signin' | 'signup' | 'reset'
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-foreground/5">
        <section className="relative hidden w-[43%] flex-col justify-between overflow-hidden bg-foreground p-10 text-background lg:flex">
          <div className="relative z-10 flex items-center gap-3 font-mono text-sm tracking-[0.18em] uppercase">
            <span className="grid size-8 place-items-center border border-background/30"><ShieldCheck className="size-4" /></span>
            tracewise
          </div>
          <div className="relative z-10 max-w-sm">
            <p className="mb-5 font-mono text-xs tracking-[0.2em] text-background/55 uppercase">Autonomous reliability</p>
            <h2 className="text-balance text-4xl font-semibold leading-tight">Find the fault. Ship the fix.</h2>
            <p className="mt-5 leading-7 text-background/65">Trace production errors from first signal to verified pull request, with an investigation trail your team can trust.</p>
          </div>
          <div className="relative z-10 flex items-center justify-between font-mono text-xs text-background/55">
            <span>BUILD 08.26</span>
            <span className="flex items-center gap-1">STATUS: READY <ArrowUpRight className="size-3" /></span>
          </div>
          <Image src="/images/arc.png" alt="Tracewise dashboard signal visualization" fill className="object-cover opacity-30" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/65 to-transparent" />
        </section>
        <section className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-[57%] lg:px-20">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 lg:hidden"><Link href="/" className="font-mono text-sm tracking-[0.18em] uppercase">tracewise</Link></div>
            <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 leading-6 text-muted-foreground">{description}</p>
            {children}
            <div className="mt-8 flex items-center justify-center gap-5 border-t border-border pt-6 font-mono text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><Github className="size-3.5" /> GitHub</span>
              <span className="flex items-center gap-1.5"><Chrome className="size-3.5" /> Google</span>
              <span>PRIVATE BY DEFAULT</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
