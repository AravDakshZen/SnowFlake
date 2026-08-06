'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 8 || password !== confirm) {
      setError(password !== confirm ? 'Passwords do not match' : 'Use at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Reset link expired')
      setMessage('Password updated. You can sign in with your new password.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell mode="reset" eyebrow="Account recovery" title="Choose a new password" description="Use a strong password you do not reuse across production tools.">
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        {message && <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">{message}</p>}
        <label className="flex flex-col gap-2 text-sm font-medium">New password<input className="h-12 rounded-xl border border-border bg-background px-4 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
        <label className="flex flex-col gap-2 text-sm font-medium">Confirm password<input className="h-12 rounded-xl border border-border bg-background px-4 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={8} required /></label>
        <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60" disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />} Update password</button>
      </form>
      <div className="mt-7 flex items-center justify-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4" /> Reset links are single-use</div>
      <p className="mt-4 text-center text-sm"><Link href="/signin" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Back to sign in</Link></p>
    </AuthShell>
  )
}
