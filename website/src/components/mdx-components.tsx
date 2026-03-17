import Image from 'next/image'
import Link from 'next/link'
import { HighlightedCode } from './highlighted-code'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MDXComponents = Record<string, React.ComponentType<any>>

export function getMdxComponents(): MDXComponents {
  return {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="mt-8 mb-4 text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
        {children}
      </h1>
    ),
    h2: ({ children, id }: { children?: React.ReactNode; id?: string }) => (
      <h2
        id={id}
        className="mt-10 mb-4 scroll-mt-24 text-xl font-semibold text-surface-900 dark:text-surface-50"
      >
        {children}
      </h2>
    ),
    h3: ({ children, id }: { children?: React.ReactNode; id?: string }) => (
      <h3
        id={id}
        className="mt-6 mb-3 scroll-mt-24 text-lg font-semibold text-surface-900 dark:text-surface-50"
      >
        {children}
      </h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="my-4 leading-7 text-surface-700 dark:text-surface-300">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="my-4 ml-6 list-disc space-y-1 text-surface-700 dark:text-surface-300">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="my-4 ml-6 list-decimal space-y-1 text-surface-700 dark:text-surface-300">
        {children}
      </ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-7">{children}</li>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="my-4 border-l-4 border-primary-500 pl-4 text-surface-600 italic dark:text-surface-400">
        {children}
      </blockquote>
    ),
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
      const isInline = !className
      if (isInline) {
        return (
          <code className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-sm text-primary-700 dark:bg-surface-800 dark:text-primary-300">
            {children}
          </code>
        )
      }
      return <code className={className}>{children}</code>
    },
    pre: ({ children }: { children?: React.ReactNode }) => {
      const codeEl = children as React.ReactElement<{ children?: string; className?: string }>
      const rawCode = codeEl?.props?.children ?? ''
      const code = typeof rawCode === 'string' ? rawCode.trimEnd() : ''

      return (
        <HighlightedCode html={null} code={code}>
          <pre className="overflow-x-auto rounded-lg bg-surface-900 p-4 text-sm text-surface-100 dark:bg-surface-950">
            {children}
          </pre>
        </HighlightedCode>
      )
    },
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="my-6 overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-700">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-surface-50 dark:bg-surface-800">{children}</thead>
    ),
    tbody: ({ children }: { children?: React.ReactNode }) => (
      <tbody className="divide-y divide-surface-200 dark:divide-surface-700">{children}</tbody>
    ),
    tr: ({ children }: { children?: React.ReactNode }) => (
      <tr className="hover:bg-surface-50 dark:hover:bg-surface-800/50">{children}</tr>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="px-4 py-3 text-left font-semibold text-surface-900 dark:text-surface-100">
        {children}
      </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="px-4 py-3 text-surface-700 dark:text-surface-300">
        {children}
      </td>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      if (!href) return <span>{children}</span>
      const isExternal = href.startsWith('http') || href.startsWith('//')
      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline underline-offset-4 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {children}
          </a>
        )
      }
      return (
        <Link
          href={href}
          className="text-primary-600 underline underline-offset-4 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {children}
        </Link>
      )
    },
    img: ({ src, alt }: { src?: string; alt?: string }) => {
      if (!src) return null
      return (
        <span className="my-6 block">
          <Image
            src={src}
            alt={alt ?? ''}
            width={800}
            height={450}
            className="rounded-lg border border-surface-200 dark:border-surface-700"
          />
        </span>
      )
    },
    hr: () => <hr className="my-8 border-surface-200 dark:border-surface-700" />,
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-surface-900 dark:text-surface-50">{children}</strong>
    ),
  }
}
