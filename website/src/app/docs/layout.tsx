import { getSidebar } from '@/lib/docs'
import { DocSidebar } from '@/components/doc-sidebar'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const sidebar = getSidebar()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex gap-8">
        <DocSidebar sidebar={sidebar} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
