'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import { TOAST_KEYFRAMES } from '@/lib/toasts'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <>
      <style>{TOAST_KEYFRAMES}</style>
      <Sonner
        theme={theme as ToasterProps['theme']}
        className="toaster group"
        position="bottom-right"
        richColors
        closeButton
        expand
        visibleToasts={5}
        gap={10}
        toastOptions={{
          duration: 3000,
          classNames: {
            toast:
              '!rounded-2xl !shadow-[0_16px_48px_rgba(0,0,0,0.18)] !border-[0.5px] group-[.toaster]:!bg-white',
            title: '!text-[13px] !font-semibold !text-[#111]',
            description: '!text-[12px] !text-black/60',
            success: '!ring-1 !ring-green-500/20',
            error: '!ring-1 !ring-red-500/25',
            info: '!ring-1 !ring-blue-500/20',
            loading: '!ring-1 !ring-amber-500/25',
          },
        }}
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
            '--width': '340px',
          } as React.CSSProperties
        }
        {...props}
      />
    </>
  )
}

export { Toaster }
