import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NavLayout } from '@/shared/components/nav-layout'
import { ThemeProvider } from '@/shared/components/theme-provider'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('argus-agent-theme');if(t==='default'){t='claude';localStorage.setItem('argus-agent-theme',t)}if(t)document.documentElement.setAttribute('data-agent-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider defaultTheme="system">
          <TooltipProvider>
            <NavLayout>
              {children}
            </NavLayout>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
