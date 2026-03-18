import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  metadataBase: new URL('https://79841.github.io/argus'),
  title: {
    default: 'Argus - AI Coding Agent Monitor',
    template: '%s | Argus',
  },
  description: 'Monitor and visualize AI coding agent usage across Claude Code, Codex CLI, and Gemini CLI.',
  openGraph: {
    type: 'website',
    siteName: 'Argus',
    title: 'Argus - AI Coding Agent Monitor',
    description: 'Monitor and visualize AI coding agent usage across Claude Code, Codex CLI, and Gemini CLI.',
    images: ['/screenshots/overview.png'],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
