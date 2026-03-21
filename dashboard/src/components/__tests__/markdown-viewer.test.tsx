import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MarkdownViewer } from '@/components/markdown-viewer'

// highlight.js CSS import mock
vi.mock('highlight.js/styles/tokyo-night-light.min.css', () => ({}))

// highlight.js mock
vi.mock('highlight.js/lib/core', () => {
  const hljs = {
    registerLanguage: vi.fn(),
    highlight: vi.fn((code: string) => ({ value: code })),
    highlightAuto: vi.fn((code: string) => ({ value: code, relevance: 10 })),
    getLanguage: vi.fn(() => true),
  }
  return { default: hljs }
})

// highlight.js 언어 모듈 mock
vi.mock('highlight.js/lib/languages/javascript', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/typescript', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/bash', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/json', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/yaml', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/xml', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/css', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/python', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/sql', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/markdown', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/go', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/rust', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/diff', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/ini', () => ({ default: {} }))
vi.mock('highlight.js/lib/languages/plaintext', () => ({ default: {} }))

describe('MarkdownViewer', () => {
  it('기본 텍스트를 렌더링한다', () => {
    render(<MarkdownViewer content="Hello world" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('헤딩을 렌더링한다', () => {
    render(<MarkdownViewer content="# My Title" />)
    expect(screen.getByRole('heading', { level: 1, name: 'My Title' })).toBeInTheDocument()
  })

  it('h2 헤딩을 렌더링한다', () => {
    render(<MarkdownViewer content="## Section" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Section' })).toBeInTheDocument()
  })

  it('Frontmatter를 파싱하여 카드로 표시한다', () => {
    const content = `---
title: My Document
description: Test desc
---

# Body`
    render(<MarkdownViewer content={content} />)
    expect(screen.getByText('My Document')).toBeInTheDocument()
    expect(screen.getByText('Test desc')).toBeInTheDocument()
  })

  it('Frontmatter 없이 본문을 렌더링한다', () => {
    const { container } = render(<MarkdownViewer content="# Just a heading\n\nSome text" />)
    expect(container.textContent).toContain('Just a heading')
    expect(container.textContent).toContain('Some text')
  })

  it('헤딩에 id 속성을 생성한다', () => {
    render(<MarkdownViewer content="# My Title" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveAttribute('id', 'my-title')
  })

  it('onHeadingsChange 콜백을 호출한다', () => {
    const onHeadingsChange = vi.fn()
    render(<MarkdownViewer content="# Title\n## Subtitle" onHeadingsChange={onHeadingsChange} />)
    expect(onHeadingsChange).toHaveBeenCalled()
  })

  it('링크를 외부 링크로 렌더링한다', () => {
    render(<MarkdownViewer content="[link](https://example.com)" />)
    const link = screen.getByRole('link', { name: 'link' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('굵은 글씨(bold)를 렌더링한다', () => {
    render(<MarkdownViewer content="**bold text**" />)
    expect(screen.getByText('bold text')).toBeInTheDocument()
  })

  it('인라인 코드를 렌더링한다', () => {
    render(<MarkdownViewer content="Use `const x = 1`" />)
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
  })

  it('목록을 렌더링한다', () => {
    const { container } = render(<MarkdownViewer content="- item 1\n- item 2" />)
    expect(container.textContent).toContain('item 1')
    expect(container.textContent).toContain('item 2')
  })

  it('빈 컨텐츠를 처리한다', () => {
    const { container } = render(<MarkdownViewer content="" />)
    expect(container).toBeInTheDocument()
  })

  it('className prop을 컨테이너에 적용한다', () => {
    const { container } = render(<MarkdownViewer content="text" className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
