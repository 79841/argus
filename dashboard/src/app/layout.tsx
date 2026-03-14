import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Nav } from '@/components/nav'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Argus — AI Agent Monitor',
  description: 'AI 코딩 에이전트 사용 현황 모니터링 대시보드',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider defaultTheme="system">
          <TooltipProvider>
            <Nav />
            <main className="ml-52 px-6 py-6">
              {children}
            </main>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
