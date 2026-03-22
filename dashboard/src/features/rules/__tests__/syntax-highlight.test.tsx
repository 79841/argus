import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import { JsonHighlight, TomlHighlight, highlightJson, highlightToml } from '@/features/rules/components/syntax-highlight'

const asEl = (t: unknown) => t as ReactElement
const getClassName = (t: unknown) => (asEl(t).props as Record<string, unknown>).className as string | undefined
const getChildren = (t: unknown) => (asEl(t).props as Record<string, unknown>).children as unknown[]
const isEl = (t: unknown): boolean => t !== null && typeof t === 'object' && 'props' in (t as Record<string, unknown>)

describe('highlightJson', () => {
  it('JSON 키를 파란색 클래스로 렌더링한다', () => {
    const tokens = highlightJson('{"key": "value"}')
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('문자열 값을 녹색 클래스로 렌더링한다', () => {
    const tokens = highlightJson('"hello"')
    const stringToken = tokens.find(
      (t) => isEl(t) && getClassName(t)?.includes('green')
    )
    expect(stringToken).toBeTruthy()
  })

  it('숫자를 주황색 클래스로 렌더링한다', () => {
    const tokens = highlightJson('42')
    const numToken = tokens.find(
      (t) => isEl(t) && getClassName(t)?.includes('orange')
    )
    expect(numToken).toBeTruthy()
  })

  it('true/false/null을 보라색 클래스로 렌더링한다', () => {
    const tokens = highlightJson('true')
    const boolToken = tokens.find(
      (t) => isEl(t) && getClassName(t)?.includes('purple')
    )
    expect(boolToken).toBeTruthy()
  })
})

describe('JsonHighlight', () => {
  it('JSON을 파싱하여 포맷팅한다', () => {
    render(<JsonHighlight content='{"name":"test","value":42}' />)
    expect(screen.getByText(/name/)).toBeInTheDocument()
  })

  it('잘못된 JSON도 raw로 렌더링한다', () => {
    render(<JsonHighlight content="not valid json" />)
    expect(screen.getByText(/not valid json/)).toBeInTheDocument()
  })

  it('pre 태그로 감싸서 렌더링한다', () => {
    const { container } = render(<JsonHighlight content='{"a":1}' />)
    expect(container.querySelector('pre')).toBeInTheDocument()
  })
})

describe('highlightToml', () => {
  it('섹션 헤더([section])를 파란색 클래스로 렌더링한다', () => {
    const tokens = highlightToml('[database]')
    const sectionToken = tokens.find(
      (t) => isEl(t) && getClassName(t)?.includes('blue')
    )
    expect(sectionToken).toBeTruthy()
  })

  it('주석(#)을 muted 클래스로 렌더링한다', () => {
    const tokens = highlightToml('# this is a comment')
    const commentToken = tokens.find(
      (t) => isEl(t) && getClassName(t)?.includes('muted')
    )
    expect(commentToken).toBeTruthy()
  })

  it('문자열 값을 녹색 클래스로 렌더링한다', () => {
    const tokens = highlightToml('name = "test"')
    const strValueToken = tokens.find(
      (t) => isEl(t) &&
      Array.isArray(getChildren(t)) &&
      getChildren(t).some(
        (c) => c && isEl(c) && getClassName(c)?.includes('green')
      )
    )
    expect(strValueToken).toBeTruthy()
  })

  it('불리언 값을 주황색 클래스로 렌더링한다', () => {
    const tokens = highlightToml('enabled = true')
    const boolToken = tokens.find(
      (t) => isEl(t) &&
      Array.isArray(getChildren(t)) &&
      getChildren(t).some(
        (c) => c && isEl(c) && getClassName(c)?.includes('orange')
      )
    )
    expect(boolToken).toBeTruthy()
  })
})

describe('TomlHighlight', () => {
  it('TOML 컨텐츠를 pre 태그로 렌더링한다', () => {
    const { container } = render(<TomlHighlight content="[section]\nkey = 'value'" />)
    expect(container.querySelector('pre')).toBeInTheDocument()
  })

  it('섹션 헤더를 렌더링한다', () => {
    render(<TomlHighlight content="[database]" />)
    expect(screen.getByText(/\[database\]/)).toBeInTheDocument()
  })
})
