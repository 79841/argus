import { NavLayout } from '@/shared/components/nav-layout'

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <NavLayout>{children}</NavLayout>
}
