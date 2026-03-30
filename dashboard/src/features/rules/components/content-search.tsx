'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RefObject } from 'react'
import { ChevronUp, ChevronDown, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useLocale } from '@/shared/lib/i18n'

type ContentSearchProps = {
  containerRef: RefObject<HTMLElement | null>
  open: boolean
  onOpenChange: (open: boolean) => void
}

const HIGHLIGHT_NAME = 'search-result'
const CURRENT_HIGHLIGHT_NAME = 'search-current'

const supportsHighlightAPI = (): boolean =>
  typeof CSS !== 'undefined' &&
  'highlights' in CSS &&
  typeof Highlight !== 'undefined'

const collectTextNodes = (root: HTMLElement): Text[] => {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (node.textContent && node.textContent.trim().length > 0) {
      nodes.push(node as Text)
    }
    node = walker.nextNode()
  }
  return nodes
}

const buildRanges = (nodes: Text[], query: string): Range[] => {
  const ranges: Range[] = []
  const lowerQuery = query.toLowerCase()
  for (const node of nodes) {
    const text = node.textContent ?? ''
    const lowerText = text.toLowerCase()
    let offset = 0
    while (offset < text.length) {
      const idx = lowerText.indexOf(lowerQuery, offset)
      if (idx === -1) break
      const range = new Range()
      range.setStart(node, idx)
      range.setEnd(node, idx + query.length)
      ranges.push(range)
      offset = idx + query.length
    }
  }
  return ranges
}

export const ContentSearch = ({ containerRef, open, onOpenChange }: ContentSearchProps) => {
  const { t } = useLocale()
  const [query, setQuery] = useState('')
  const [ranges, setRanges] = useState<Range[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const clearHighlights = useCallback(() => {
    if (!supportsHighlightAPI()) return
    CSS.highlights.delete(HIGHLIGHT_NAME)
    CSS.highlights.delete(CURRENT_HIGHLIGHT_NAME)
  }, [])

  const applyHighlights = useCallback((allRanges: Range[], current: number) => {
    if (!supportsHighlightAPI()) return
    CSS.highlights.delete(HIGHLIGHT_NAME)
    CSS.highlights.delete(CURRENT_HIGHLIGHT_NAME)
    if (allRanges.length === 0) return
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...allRanges))
    if (allRanges[current]) {
      CSS.highlights.set(CURRENT_HIGHLIGHT_NAME, new Highlight(allRanges[current]))
    }
  }, [])

  const scrollToCurrent = useCallback((allRanges: Range[], current: number) => {
    const range = allRanges[current]
    if (!range) return
    const node = range.startContainer
    const el = node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!open) {
      clearHighlights()
      setQuery('')
      setRanges([])
      setCurrentIndex(0)
      return
    }
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open, clearHighlights])

  useEffect(() => {
    if (!open || !containerRef.current) {
      clearHighlights()
      setRanges([])
      setCurrentIndex(0)
      return
    }
    if (query.length === 0) {
      clearHighlights()
      setRanges([])
      setCurrentIndex(0)
      return
    }
    const nodes = collectTextNodes(containerRef.current)
    const found = buildRanges(nodes, query)
    setRanges(found)
    const idx = 0
    setCurrentIndex(idx)
    applyHighlights(found, idx)
    scrollToCurrent(found, idx)
  }, [query, open, containerRef, applyHighlights, scrollToCurrent, clearHighlights])

  useEffect(() => {
    if (ranges.length === 0) return
    applyHighlights(ranges, currentIndex)
    scrollToCurrent(ranges, currentIndex)
  }, [currentIndex, ranges, applyHighlights, scrollToCurrent])

  useEffect(() => {
    return () => {
      clearHighlights()
    }
  }, [clearHighlights])

  const goNext = useCallback(() => {
    if (ranges.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % ranges.length)
  }, [ranges.length])

  const goPrev = useCallback(() => {
    if (ranges.length === 0) return
    setCurrentIndex((prev) => (prev - 1 + ranges.length) % ranges.length)
  }, [ranges.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          goPrev()
        } else {
          goNext()
        }
        e.preventDefault()
      }
    },
    [goNext, goPrev, onOpenChange],
  )

  if (!open) return null

  const matchLabel = ranges.length === 0
    ? (query.length > 0 ? '0/0' : '')
    : `${currentIndex + 1}/${ranges.length}`

  return (
    <>
      <style>{`
        ::highlight(${HIGHLIGHT_NAME}) {
          background-color: rgba(255, 213, 0, 0.3);
          color: inherit;
        }
        ::highlight(${CURRENT_HIGHLIGHT_NAME}) {
          background-color: rgba(255, 165, 0, 0.5);
          color: inherit;
        }
      `}</style>
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background border rounded-md shadow-sm px-2 py-1">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('rules.search.placeholder')}
          className="text-xs h-7 w-48 bg-transparent outline-none px-1"
        />
        {matchLabel && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">{matchLabel}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={goPrev}
          disabled={ranges.length === 0}
          aria-label={t('rules.search.prev')}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={goNext}
          disabled={ranges.length === 0}
          aria-label={t('rules.search.next')}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onOpenChange(false)}
          aria-label={t('rules.search.close')}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </>
  )
}
