'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import { Copy, Check, FileText } from 'lucide-react'
import type { Components } from 'react-markdown'
import 'highlight.js/styles/tokyo-night-light.min.css'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import mdLang from 'highlight.js/lib/languages/markdown'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import diff from 'highlight.js/lib/languages/diff'
import ini from 'highlight.js/lib/languages/ini'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('jsx', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('tsx', typescript)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('zsh', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('markdown', mdLang)
hljs.registerLanguage('md', mdLang)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('diff', diff)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('toml', ini)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('text', plaintext)

export type Heading = {
  id: string
  text: string
  level: number
}

type FrontmatterData = Record<string, string>

type MarkdownViewerProps = {
  content: string
  className?: string
  onHeadingsChange?: (headings: Heading[]) => void
}

const makeSlugify = (counterRef: { current: number }) => (text: string): string => {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-\u3131-\u318E\uAC00-\uD7A3]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || `heading-${counterRef.current++}`
}

const parseFrontmatter = (content: string): { frontmatter: FrontmatterData | null; body: string } => {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (!match) return { frontmatter: null, body: content }

  const raw = match[1]
  const data: FrontmatterData = {}
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key) data[key] = val
  }

  return {
    frontmatter: Object.keys(data).length > 0 ? data : null,
    body: content.slice(match[0].length),
  }
}

const FRONTMATTER_LABELS: Record<string, string> = {
  title: '제목',
  name: '이름',
  description: '설명',
  date: '날짜',
  author: '작성자',
  type: '유형',
  tags: '태그',
  version: '버전',
  model: '모델',
}

const FrontmatterCard = ({ data }: { data: FrontmatterData }) => {
  const title = data.title || data.name
  const entries = Object.entries(data).filter(([k]) => k !== 'title' && k !== 'name')

  return (
    <div className="mb-4 rounded-lg bg-muted/30 overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-subtle)] bg-muted/50">
          <FileText className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
      )}
      {entries.length > 0 && (
        <div className="px-4 py-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {entries.map(([key, value]) => (
            <div key={key} className="contents">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {FRONTMATTER_LABELS[key] ?? key}
              </span>
              <span className="text-xs">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type CodeBlockProps = {
  language: string
  code: string
}

const CodeBlock = ({ language, code }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false)

  const highlightedHtml = useMemo(() => {
    if (language && hljs.getLanguage(language)) {
      try {
        return hljs.highlight(code, { language }).value
      } catch {
        return null
      }
    }
    try {
      const result = hljs.highlightAuto(code)
      if (result.relevance > 5) return result.value
    } catch {
      // fallback
    }
    return null
  }, [code, language])

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {
      // clipboard API 미지원 환경 무시
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-2 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-muted/30 px-3 py-1 border-b border-[var(--border-subtle)]">
        {language ? (
          <span className="text-xs text-muted-foreground font-mono">{language}</span>
        ) : (
          <span />
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="코드 복사"
        >
          {copied ? (
            <Check className="size-3 text-emerald-500" />
          ) : (
            <Copy className="size-3" />
          )}
        </button>
      </div>
      <pre className="bg-muted/30 text-xs font-mono p-3 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto">
        {highlightedHtml ? (
          <code
            className="hljs"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  )
}

export const MarkdownViewer = ({ content, className, onHeadingsChange }: MarkdownViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const headingCounterRef = useRef(0)
  const { frontmatter, body } = useMemo(() => {
    headingCounterRef.current = 0
    return parseFrontmatter(content)
  }, [content])

  const slugify = useMemo(() => makeSlugify(headingCounterRef), [])

  const extractHeadings = useCallback(() => {
    if (!containerRef.current || !onHeadingsChange) return
    const els = containerRef.current.querySelectorAll('h1, h2, h3, h4')
    const headings: Heading[] = Array.from(els).map((el) => ({
      id: el.id,
      text: el.textContent ?? '',
      level: parseInt(el.tagName[1], 10),
    }))
    onHeadingsChange(headings)
  }, [onHeadingsChange])

  useEffect(() => {
    extractHeadings()
  }, [content, extractHeadings])

  const components: Components = {
    h1: ({ children, ...props }) => {
      const text = String(children)
      const id = slugify(text)
      return (
        <h1 id={id} className="text-2xl font-bold mt-4 mb-2 scroll-mt-4" {...props}>
          {children}
        </h1>
      )
    },
    h2: ({ children, ...props }) => {
      const text = String(children)
      const id = slugify(text)
      return (
        <h2 id={id} className="text-xl font-semibold mt-3 mb-1 scroll-mt-4" {...props}>
          {children}
        </h2>
      )
    },
    h3: ({ children, ...props }) => {
      const text = String(children)
      const id = slugify(text)
      return (
        <h3 id={id} className="text-base font-semibold mt-2 mb-1 scroll-mt-4" {...props}>
          {children}
        </h3>
      )
    },
    h4: ({ children, ...props }) => {
      const text = String(children)
      const id = slugify(text)
      return (
        <h4 id={id} className="text-sm font-semibold mt-2 mb-1 scroll-mt-4" {...props}>
          {children}
        </h4>
      )
    },
    p: ({ children, ...props }) => (
      <p className="text-sm leading-relaxed" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="pl-4 space-y-0.5 list-disc list-outside" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="pl-4 space-y-0.5 list-decimal list-outside" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="text-sm leading-relaxed pl-1 [&>input[type=checkbox]]:mr-1.5 [&>input[type=checkbox]]:align-middle" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote className="border-l-2 border-muted-foreground pl-3 italic text-muted-foreground my-1" {...props}>
        {children}
      </blockquote>
    ),
    table: ({ children, ...props }) => (
      <div className="my-2 overflow-x-auto">
        <table className="text-xs border-collapse w-full" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => <thead {...props}>{children}</thead>,
    tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }) => (
      <tr className="hover:bg-muted/50" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }) => (
      <th className="border px-3 py-1.5 text-left font-semibold bg-muted" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="border px-3 py-1.5" {...props}>
        {children}
      </td>
    ),
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
        {...props}
      >
        {children}
      </a>
    ),
    pre: ({ children }) => <>{children}</>,
    code: ({ children, className: codeClassName, node, ...props }) => {
      const isBlock = node?.position
        ? node.position.start.line !== node.position.end.line ||
          codeClassName?.startsWith('language-')
        : codeClassName?.startsWith('language-') ?? false

      if (isBlock) {
        const language = codeClassName?.replace('language-', '') ?? ''
        const code = String(children).replace(/\n$/, '')
        return <CodeBlock language={language} code={code} />
      }

      return (
        <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
          {children}
        </code>
      )
    },
    del: ({ children, ...props }) => (
      <del className="line-through" {...props}>
        {children}
      </del>
    ),
    hr: ({ ...props }) => <hr className="border-t my-3" {...props} />,
    img: () => null,
  }

  return (
    <div ref={containerRef} className={className}>
      {frontmatter && <FrontmatterCard data={frontmatter} />}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkFrontmatter]}
        components={components}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
