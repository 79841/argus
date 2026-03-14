import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Nav } from '@/components/nav'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TopBarProvider } from '@/components/top-bar-context'
import { TopBar } from '@/components/top-bar'
import { BottomBar } from '@/components/bottom-bar'
import { RightSidebar } from '@/components/right-sidebar'
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
            <TopBarProvider>
              <Nav />
              <div className="ml-52 flex h-screen flex-col">
                <TopBar />
                <div className="flex min-h-0 flex-1">
                  <main className="flex-1 overflow-auto px-6 py-6">
                    {children}
                  </main>
                  <RightSidebar />
                </div>
                <BottomBar />
              </div>
            </TopBarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
