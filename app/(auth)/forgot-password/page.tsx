'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to send reset email')
      setSent(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send reset email') } finally { setLoading(false) }
  }
  return <AuthShell mode="reset" eyebrow="Account recovery" title="Reset your password" description="We will send a secure, single-use link to your inbox.">{sent ? <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-6 text-center"><MailCheck className="mx-auto size-8" /><h2 className="mt-4 font-semibold">Check your inbox</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">If an account exists for that address, a reset link is on its way.</p><Link href="/signin" className="mt-5 inline-block text-sm font-semibold underline-offset-4 hover:underline">Return to sign in</Link></div> : <form onSubmit={submit} className="mt-8 flex flex-col gap-4">{error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}<label className="flex flex-col gap-2 text-sm font-medium">Work email<input className="h-12 rounded-xl border border-border bg-background px-4 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label><button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60" disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />} Send reset link</button><p className="text-center text-sm"><Link href="/signin" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Back to sign in</Link></p></form>}</AuthShell>
}
