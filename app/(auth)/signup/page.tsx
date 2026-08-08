'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Github, Chrome, Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'
import { toastSuccess, toastError, toastInfo } from '@/lib/toasts'

export default function SignUpPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); toastError('Passwords do not match'); return }
    setLoading(true)
    try {
      const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, email: form.email, password: form.password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to create account')
      if (data.requiresEmailConfirmation) {
        toastSuccess('Account created', 'Check your inbox to confirm your email.')
      } else {
        toastSuccess('Account created', 'Welcome to Tracewise.')
      }
      router.replace('/signin?created=1')
    } catch (cause) { const message = cause instanceof Error ? cause.message : 'Unable to create account'; setError(message); toastError('Could not create account', message); setLoading(false) }
  }
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return <AuthShell eyebrow="Start shipping safely" title="Create your workspace" description="Create a Tracewise account and connect your first production repository.">
    <div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="/api/auth/oauth?provider=github" onClick={() => toastInfo('Redirecting to GitHub', 'Authorize the app to continue.')} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border font-medium transition hover:bg-muted"><Github className="size-4" /> GitHub</a><a href="/api/auth/oauth?provider=google" onClick={() => toastInfo('Redirecting to Google', 'Authorize the app to continue.')} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border font-medium transition hover:bg-muted"><Chrome className="size-4" /> Google</a></div>
    <div className="my-7 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>OR USE EMAIL</span><span className="h-px flex-1 bg-border" /></div>
    <form onSubmit={handleSignUp} className="flex flex-col gap-4">{error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      <label className="flex flex-col gap-2 text-sm font-medium">Full name<input className="h-12 rounded-xl border border-border bg-background px-4 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10" value={form.name} onChange={update('name')} placeholder="Alex Morgan" required /></label>
      <label className="flex flex-col gap-2 text-sm font-medium">Work email<input className="h-12 rounded-xl border border-border bg-background px-4 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10" type="email" autoComplete="email" value={form.email} onChange={update('email')} placeholder="you@company.com" required /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm font-medium">Password<input className="h-12 rounded-xl border border-border bg-background px-4 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} placeholder="8+ characters" minLength={8} required /></label><label className="flex flex-col gap-2 text-sm font-medium">Confirm password<input className="h-12 rounded-xl border border-border bg-background px-4 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Repeat password" minLength={8} required /></label></div>
      <button className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60" disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />} {loading ? 'Creating workspace' : 'Create account'}</button>
    </form><p className="mt-7 text-center text-sm text-muted-foreground">Already have an account? <Link href="/signin" className="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</Link></p>
  </AuthShell>
}
