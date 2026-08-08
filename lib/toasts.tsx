'use client'

import { toast } from 'sonner'
import type { ReactNode } from 'react'
import { PixelIcon } from '@/components/pixel-icon'
import type { IconType } from '@/components/pixel-icon'

// ─────────────────────────────────────────────────────────────────────────────
// Animated toast system
//
// The site's pixel-animation assets (components/pixel-icon.tsx) double as the
// toast icons so feedback keeps the same visual language as the rest of the
// app. Every toast renders inside <ToastShell>, which adds a small entrance
// animation (scale + slide), a subtle glow, and a shimmering progress bar —
// all driven by the keyframes defined at the bottom of this file.
// ─────────────────────────────────────────────────────────────────────────────

export type ToastTone = 'success' | 'error' | 'info' | 'loading' | 'custom'

// Which pixel animation plays for each tone:
//   success  → "agents"  (running figure — job done)
//   error    → "platform" (orbiting node graph — something's broken)
//   info     → "integrations" (tiles lighting up — heads up)
//   loading  → "workflow" (hourglass — sand is flowing)
const TONE_ICONS: Record<ToastTone, IconType> = {
  success: 'agents',
  error: 'platform',
  info: 'integrations',
  loading: 'workflow',
  custom: 'pricing',
}

const TONE_STYLES: Record<ToastTone, { ring: string; glow: string; bar: string }> = {
  success: { ring: 'rgba(34,197,94,0.35)', glow: 'rgba(34,197,94,0.16)', bar: '#22c55e' },
  error: { ring: 'rgba(239,68,68,0.35)', glow: 'rgba(239,68,68,0.16)', bar: '#ef4444' },
  info: { ring: 'rgba(59,130,246,0.35)', glow: 'rgba(59,130,246,0.16)', bar: '#3b82f6' },
  loading: { ring: 'rgba(234,179,8,0.35)', glow: 'rgba(234,179,8,0.16)', bar: '#eab308' },
  custom: { ring: 'rgba(168,85,247,0.35)', glow: 'rgba(168,85,247,0.16)', bar: '#a855f7' },
}

interface ToastShellProps {
  tone: ToastTone
  title: ReactNode
  description?: ReactNode
  iconSize?: number
  action?: ReactNode
}

/**
 * Custom-rendered toast with the animated pixel icon, entrance animation,
 * tone glow, and a shimmering progress bar. Used via toast.custom().
 */
export function ToastShell({ tone, title, description, iconSize = 18, action }: ToastShellProps) {
  const style = TONE_STYLES[tone]
  return (
    <div
      className="sf-toast-shell"
      style={
        {
          '--sf-ring': style.ring,
          '--sf-glow': style.glow,
          '--sf-bar': style.bar,
        } as React.CSSProperties
      }
    >
      <span className="sf-toast-icon">
        <PixelIcon type={TONE_ICONS[tone]} size={iconSize} />
      </span>
      <span className="sf-toast-body">
        <span className="sf-toast-title">{title}</span>
        {description && <span className="sf-toast-desc">{description}</span>}
      </span>
      {action && <span className="sf-toast-action">{action}</span>}
      <span className="sf-toast-progress" aria-hidden="true" />
    </div>
  )
}

function customToast(opts: { tone: ToastTone; title: ReactNode; description?: ReactNode; duration?: number; action?: ReactNode }) {
  return toast.custom(
    () => (
      <ToastShell tone={opts.tone} title={opts.title} description={opts.description} action={opts.action} />
    ),
    {
      duration: opts.duration,
      // Keep sonner's managed enter/exit, but we style the inner shell ourselves.
      className: 'sf-toast-custom',
    },
  )
}

// Simple wrappers over sonner's built-ins — each still carries the animated
// pixel icon so the feedback language is consistent everywhere.
export function toastSuccess(title: ReactNode, description?: ReactNode, duration?: number) {
  return toast.success(title, { description, icon: <PixelIcon type="agents" size={18} />, duration })
}

export function toastError(title: ReactNode, description?: ReactNode, duration?: number) {
  return toast.error(title, { description, icon: <PixelIcon type="platform" size={18} />, duration })
}

export function toastInfo(title: ReactNode, description?: ReactNode, duration?: number) {
  return toast.info(title, { description, icon: <PixelIcon type="integrations" size={18} />, duration })
}

export function toastLoading(title: ReactNode, description?: ReactNode) {
  return toast.loading(title, { description, icon: <PixelIcon type="workflow" size={18} /> })
}

export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: ReactNode
    success: ReactNode
    error: ReactNode
  },
) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  })
}

// Richer variants — use these where you want the full animated shell.
export const toastAnimated = {
  success: (title: ReactNode, description?: ReactNode, action?: ReactNode) =>
    customToast({ tone: 'success', title, description, action }),
  error: (title: ReactNode, description?: ReactNode, action?: ReactNode) =>
    customToast({ tone: 'error', title, description, action, duration: 6000 }),
  info: (title: ReactNode, description?: ReactNode, action?: ReactNode) =>
    customToast({ tone: 'info', title, description, action }),
  loading: (title: ReactNode, description?: ReactNode) =>
    customToast({ tone: 'loading', title, description, duration: Infinity }),
  custom: (title: ReactNode, description?: ReactNode, action?: ReactNode) =>
    customToast({ tone: 'custom', title, description, action }),
}

export function dismissToast(id?: string | number) {
  if (id) toast.dismiss(id)
  else toast.dismiss()
}

export function dismissAll() {
  toast.dismiss()
}

// Keep `ANIMATED_ICONS` for any existing import that references it.
export const ANIMATED_ICONS: Record<ToastTone, ReactNode> = {
  success: <PixelIcon type="agents" size={18} />,
  error: <PixelIcon type="platform" size={18} />,
  info: <PixelIcon type="integrations" size={18} />,
  loading: <PixelIcon type="workflow" size={18} />,
  custom: <PixelIcon type="pricing" size={18} />,
}

// CSS for the animated shell — injected once with the Toaster mount.
export const TOAST_KEYFRAMES = `
@keyframes sf-toast-pop {
  0%   { opacity: 0; transform: scale(0.85) translateY(10px); }
  60%  { opacity: 1; transform: scale(1.03) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes sf-icon-spin {
  to { transform: rotate(360deg); }
}
@keyframes sf-bar-fill {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
}
.sf-toast-custom[data-sonner-toast] {
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}
.sf-toast-shell {
  --sf-ring: rgba(0,0,0,0.15);
  --sf-glow: rgba(0,0,0,0.06);
  --sf-bar: #111;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 240px;
  max-width: 340px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--sf-ring);
  background: #fff;
  box-shadow: 0 12px 32px rgba(0,0,0,0.14), 0 0 0 4px var(--sf-glow);
  overflow: hidden;
  animation: sf-toast-pop 0.32s cubic-bezier(0.16,1,0.3,1) both;
}
.sf-toast-icon {
  flex-shrink: 0;
  margin-top: 1px;
  animation: sf-icon-spin 6s linear infinite;
}
.sf-toast-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.sf-toast-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: #111;
}
.sf-toast-desc {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(17,17,17,0.6);
  word-break: break-word;
}
.sf-toast-action {
  flex-shrink: 0;
  margin-left: auto;
}
.sf-toast-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--sf-bar), transparent);
  animation: sf-bar-fill 2.4s ease-in-out infinite;
  opacity: 0.35;
  pointer-events: none;
}
`
