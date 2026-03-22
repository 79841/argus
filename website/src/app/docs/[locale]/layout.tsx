import { getSidebar, isValidLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/docs'
import type { Locale } from '@/lib/docs'
import { DocSidebar } from '@/components/doc-sidebar'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export default async function DocsLocaleLayout({ children, params }: Props) {
  const { locale: rawLocale } = await params
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE
  const sidebar = getSidebar(locale)

  return (
    <div className="flex gap-8">
      <DocSidebar sidebar={sidebar} locale={locale} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
