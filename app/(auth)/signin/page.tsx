'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'
import { GoogleIcon, GitHubIcon } from '@/components/brand-icons'
import { toastSuccess, toastError, toastInfo } from '@/lib/toasts'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const errorCode = new URLSearchParams(window.location.search).get('error')
    if (errorCode === 'google_unavailable') setError('Google sign-in is not configured for this Supabase project yet.')
    if (errorCode === 'github_unavailable') setError('GitHub sign-in is not configured for this Supabase project yet.')
    if (errorCode === 'oauth_callback') setError('The sign-in provider could not complete authentication. Please try again.')
  }, [])

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Invalid email or password')
      toastSuccess('Signed in', 'Welcome back to Snowflake.')
      router.replace('/dashboard')
      router.refresh()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to sign in'
      setError(message)
      toastError('Could not sign in', message)
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to Snowflake" description="Your production signal is waiting. Continue to the reliability workspace.">
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a href="/api/auth/oauth?provider=github" onClick={() => toastInfo('Redirecting to GitHub', 'Authorize the app to continue.')} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border font-medium transition hover:bg-muted"><GitHubIcon className="size-4" /> GitHub</a>
        <a href="/api/auth/oauth?provider=google" onClick={() => toastInfo('Redirecting to Google', 'Authorize the app to continue.')} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border font-medium transition hover:bg-muted"><GoogleIcon className="size-4" /> Google</a>
      </div>
      <div className="my-7 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>OR CONTINUE WITH EMAIL</span><span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={handleSignIn} className="flex flex-col gap-4">
        {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        <label className="flex flex-col gap-2 text-sm font-medium">Email<input className="h-12 rounded-xl border border-border bg-background px-4 outline-none transition placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-foreground/10" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label>
        <label className="flex flex-col gap-2 text-sm font-medium">Password<input className="h-12 rounded-xl border border-border bg-background px-4 outline-none transition placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-foreground/10" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label>
        <div className="flex justify-end"><Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Forgot password?</Link></div>
        <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60" disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />} {loading ? 'Signing in' : 'Sign in'}</button>
      </form>
      <p className="mt-7 text-center text-sm text-muted-foreground">New to Snowflake? <Link href="/signup" className="font-semibold text-foreground underline-offset-4 hover:underline">Create an account</Link></p>
    </AuthShell>
  )
}
