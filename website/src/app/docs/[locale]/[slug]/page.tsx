import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import {
  getAllDocs,
  getAdjacentDocs,
  getDoc,
  isValidLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from '@/lib/docs'
import type { Locale } from '@/lib/docs'
import { highlightCode } from '@/lib/highlight'
import { HighlightedCode } from '@/components/highlighted-code'
import { getMdxComponents } from '@/components/mdx-components'
import { Toc } from '@/components/toc'
import { extractTocItems } from '@/lib/toc-utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    getAllDocs(locale).map((doc) => ({ locale, slug: doc.slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isValidLocale(locale)) return {}
  const doc = getDoc(slug, locale)
  if (!doc) return {}
  return {
    title: doc.title,
    description: doc.description,
    alternates: {
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((l) => [l, `/docs/${l}/${slug}`]),
      ),
    },
  }
}

async function buildHighlightedPre(content: string) {
  const codeBlockPattern = /```(\w*)\n([\s\S]*?)```/g
  const highlighted = new Map<string, string>()

  let match: RegExpExecArray | null
  while ((match = codeBlockPattern.exec(content)) !== null) {
    const lang = match[1] || 'text'
    const code = match[2].trimEnd()
    const key = `${lang}:::${code}`
    if (!highlighted.has(key)) {
      highlighted.set(key, await highlightCode(code, lang))
    }
  }

  return highlighted
}

export default async function DocPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE
  const doc = getDoc(slug, locale)
  if (!doc) notFound()

  const { prev, next } = getAdjacentDocs(slug, locale)
  const tocItems = extractTocItems(doc.content)
  const highlighted = await buildHighlightedPre(doc.content)

  const baseComponents = getMdxComponents()
  const mdxComponents = {
    ...baseComponents,
    pre: ({ children }: { children?: React.ReactNode }) => {
      const codeEl = children as React.ReactElement<{ children?: string; className?: string }>
      const rawCode = codeEl?.props?.children ?? ''
      const className = codeEl?.props?.className ?? ''
      const lang = className.replace('language-', '') || 'text'
      const code = typeof rawCode === 'string' ? rawCode.trimEnd() : ''
      const html = highlighted.get(`${lang}:::${code}`) ?? highlighted.get(`text:::${code}`) ?? null

      return <HighlightedCode html={html} code={code} />
    },
  }

  const otherLocale = locale === 'en' ? 'ko' : 'en'

  return (
    <div className="flex gap-8">
      <article className="min-w-0 flex-1">
        <header className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {doc.group}
            </p>
            <Link
              href={`/docs/${otherLocale}/${slug}`}
              className="rounded-md border border-surface-200 px-2 py-1 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
            >
              {otherLocale === 'en' ? 'English' : '한국어'}
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
            {doc.title}
          </h1>
          {doc.description && (
            <p className="mt-3 text-lg text-surface-600 dark:text-surface-400">
              {doc.description}
            </p>
          )}
        </header>

        <MDXRemote
          source={doc.content}
          components={mdxComponents}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />

        {(prev || next) && (
          <nav className="mt-12 flex items-center justify-between border-t border-surface-200 pt-6 dark:border-surface-700">
            {prev ? (
              <Link
                href={`/docs/${locale}/${prev.slug}`}
                className="group flex items-center gap-2 rounded-lg border border-surface-200 px-4 py-3 text-sm transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-surface-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
              >
                <ChevronLeft size={16} className="text-surface-400 group-hover:text-primary-600" />
                <span>
                  <span className="block text-xs text-surface-500 dark:text-surface-400">Previous</span>
                  <span className="font-medium text-surface-900 dark:text-surface-100">{prev.title}</span>
                </span>
              </Link>
            ) : (
              <div />
            )}

            {next ? (
              <Link
                href={`/docs/${locale}/${next.slug}`}
                className="group flex items-center gap-2 rounded-lg border border-surface-200 px-4 py-3 text-sm transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-surface-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
              >
                <span className="text-right">
                  <span className="block text-xs text-surface-500 dark:text-surface-400">Next</span>
                  <span className="font-medium text-surface-900 dark:text-surface-100">{next.title}</span>
                </span>
                <ChevronRight size={16} className="text-surface-400 group-hover:text-primary-600" />
              </Link>
            ) : (
              <div />
            )}
          </nav>
        )}
      </article>

      {tocItems.length > 0 && (
        <aside className="hidden w-48 shrink-0 xl:block">
          <div className="sticky top-24">
            <Toc items={tocItems} />
          </div>
        </aside>
      )}
    </div>
  )
}
