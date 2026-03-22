import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DateRangePicker } from '@/shared/components/date-range-picker'

const TODAY = '2026-03-21'
const YESTERDAY = '2026-03-20'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-21T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('DateRangePicker', () => {
  it('현재 날짜 범위 레이블을 렌더링한다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /오늘/ })).toBeInTheDocument()
  })

  it('버튼 클릭 시 드롭다운이 열린다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /오늘/ }))
    expect(screen.getByText('최근 7일')).toBeInTheDocument()
    expect(screen.getByText('최근 30일')).toBeInTheDocument()
  })

  it('프리셋 클릭 시 onChange를 올바른 범위로 호출한다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /오늘/ }))
    fireEvent.click(screen.getByText('어제'))

    expect(onChange).toHaveBeenCalledWith({ from: YESTERDAY, to: YESTERDAY })
  })

  it('프리셋 선택 후 드롭다운이 닫힌다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /오늘/ }))
    fireEvent.click(screen.getByText('어제'))

    expect(screen.queryByText('최근 7일')).not.toBeInTheDocument()
  })

  it('커스텀 범위 적용 버튼이 존재한다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /오늘/ }))
    expect(screen.getByRole('button', { name: '적용' })).toBeInTheDocument()
  })

  it('from > to일 때 적용 버튼이 비활성화된다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /오늘/ }))

    const inputs = screen.getAllByDisplayValue(TODAY)
    fireEvent.change(inputs[0], { target: { value: '2026-04-01' } })

    const applyBtn = screen.getByRole('button', { name: '적용' })
    expect(applyBtn).toBeDisabled()
  })

  it('외부 클릭 시 드롭다운이 닫힌다', () => {
    const onChange = vi.fn()
    render(
      <div>
        <div data-testid="outside">outside</div>
        <DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />
      </div>
    )

    fireEvent.click(screen.getByRole('button', { name: /오늘/ }))
    expect(screen.getByText('최근 7일')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('최근 7일')).not.toBeInTheDocument()
  })

  it('어제 레이블을 표시한다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: YESTERDAY, to: YESTERDAY }} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /어제/ })).toBeInTheDocument()
  })

  it('5개 프리셋이 드롭다운에 표시된다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /오늘/ }))

    const presets = ['어제', '최근 7일', '최근 30일', '이번 달']
    presets.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
    expect(screen.getAllByText('오늘').length).toBeGreaterThan(0)
  })
})
