'use client'

import { useState } from 'react'

type HighlightedCodeProps = {
  html: string | null
  code: string
  children?: React.ReactNode
}

export function HighlightedCode({ html, code, children }: HighlightedCodeProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700">
      <button
        onClick={handleCopy}
        className="absolute right-3 top-3 z-10 rounded-md bg-surface-700/80 px-2 py-1 text-xs text-surface-200 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-600"
        aria-label="Copy code"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      {html ? (
        <div
          className="overflow-x-auto text-sm [&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        children
      )}
    </div>
  )
}
