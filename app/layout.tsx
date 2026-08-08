import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono, IBM_Plex_Sans } from 'next/font/google'
import { Courier_Prime } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _courierPrime = Courier_Prime({ weight: ["400", "700"], subsets: ["latin"] });
const _ibmPlexSans = IBM_Plex_Sans({ weight: ["300", "400", "500", "600"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Snowflake — Error Detection & Automatic Fixes',
  description: 'Snowflake helps engineering teams detect errors, analyze root causes, and automatically generate fixes with AI.',
  keywords: ['error analysis', 'incident response', 'error investigation', 'root cause analysis', 'automated fixes', 'AI debugging'],
  authors: [{ name: 'Snowflake' }],
  openGraph: {
    title: 'Snowflake — Error Detection & Automatic Fixes',
    description: 'Detect errors, analyze root causes, and automatically generate fixes with AI.',
    type: 'website',
    url: 'https://snowflake.app',
    siteName: 'Snowflake',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snowflake — Error Detection & Automatic Fixes',
    description: 'Detect errors, analyze root causes, and automatically generate fixes with AI.',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <Analytics />
      </body>
    </html>
  )
}
