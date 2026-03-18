'use client'

import type { ReactNode } from 'react'

export const highlightJson = (json: string): ReactNode[] => {
  const tokens = json.split(/(\"(?:[^"\\]|\\.)*\"(?:\s*:)?|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:])/g)
  return tokens.map((token, i) => {
    if (!token) return null
    if (/^".*":$/.test(token)) {
      const key = token.slice(0, -1)
      return (
        <span key={i}>
          <span className="text-blue-600 dark:text-blue-400">{key}</span>
          <span className="text-muted-foreground">:</span>
        </span>
      )
    }
    if (/^".*"$/.test(token)) {
      return <span key={i} className="text-green-600 dark:text-green-400">{token}</span>
    }
    if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(token)) {
      return <span key={i} className="text-orange-600 dark:text-orange-400">{token}</span>
    }
    if (token === 'true' || token === 'false' || token === 'null') {
      return <span key={i} className="text-purple-600 dark:text-purple-400">{token}</span>
    }
    if (/^[{}[\],]$/.test(token)) {
      return <span key={i} className="text-muted-foreground">{token}</span>
    }
    return <span key={i}>{token}</span>
  })
}

export const JsonHighlight = ({ content }: { content: string }) => {
  let formatted = content
  try {
    formatted = JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    // use raw
  }
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
      {highlightJson(formatted)}
    </pre>
  )
}

export const highlightToml = (content: string): ReactNode[] => {
  return content.split('\n').map((line, i) => {
    if (/^\s*#/.test(line)) {
      return (
        <span key={i} className="text-muted-foreground italic">
          {line}{'\n'}
        </span>
      )
    }
    if (/^\s*\[/.test(line)) {
      return (
        <span key={i} className="text-blue-600 dark:text-blue-400 font-semibold">
          {line}{'\n'}
        </span>
      )
    }
    const kvMatch = line.match(/^(\s*)([^=\s][^=]*?)\s*(=)\s*(.*)$/)
    if (kvMatch) {
      const [, indent, key, eq, val] = kvMatch
      let valueNode: ReactNode

      const commentIdx = val.search(/#(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      const valueStr = commentIdx >= 0 ? val.slice(0, commentIdx).trimEnd() : val
      const commentStr = commentIdx >= 0 ? val.slice(commentIdx) : ''

      if (/^".*"$/.test(valueStr) || /^'.*'$/.test(valueStr)) {
        valueNode = <span className="text-green-600 dark:text-green-400">{valueStr}</span>
      } else if (/^(true|false)$/.test(valueStr) || /^-?\d/.test(valueStr)) {
        valueNode = <span className="text-orange-600 dark:text-orange-400">{valueStr}</span>
      } else {
        valueNode = <span>{valueStr}</span>
      }

      return (
        <span key={i}>
          {indent}
          <span className="text-foreground">{key}</span>
          <span className="text-muted-foreground">{eq}</span>
          {valueNode}
          {commentStr && <span className="text-muted-foreground italic"> {commentStr}</span>}
          {'\n'}
        </span>
      )
    }

    return <span key={i}>{line}{'\n'}</span>
  })
}

export const TomlHighlight = ({ content }: { content: string }) => {
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
      {highlightToml(content)}
    </pre>
  )
}
