import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DateRangePicker } from '@/components/date-range-picker'

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
    expect(screen.getByRole('button', { name: /Today/ })).toBeInTheDocument()
  })

  it('버튼 클릭 시 드롭다운이 열린다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Today/ }))
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('프리셋 클릭 시 onChange를 올바른 범위로 호출한다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Today/ }))
    fireEvent.click(screen.getByText('Yesterday'))

    expect(onChange).toHaveBeenCalledWith({ from: YESTERDAY, to: YESTERDAY })
  })

  it('프리셋 선택 후 드롭다운이 닫힌다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Today/ }))
    fireEvent.click(screen.getByText('Yesterday'))

    expect(screen.queryByText('Last 7 days')).not.toBeInTheDocument()
  })

  it('커스텀 범위 Apply 버튼이 존재한다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Today/ }))
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
  })

  it('from > to일 때 Apply 버튼이 비활성화된다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Today/ }))

    const inputs = screen.getAllByDisplayValue(TODAY)
    // from 날짜를 미래로 설정하면 to보다 커져서 disabled
    fireEvent.change(inputs[0], { target: { value: '2026-04-01' } })

    const applyBtn = screen.getByRole('button', { name: 'Apply' })
    expect(applyBtn).toBeDisabled()
  })

  it('외부 클릭 시 드롭다운이 닫힌다', () => {
    const onChange = vi.fn()
    const { container } = render(
      <div>
        <div data-testid="outside">outside</div>
        <DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />
      </div>
    )

    fireEvent.click(screen.getByRole('button', { name: /Today/ }))
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('Last 7 days')).not.toBeInTheDocument()
  })

  it('Yesterday 레이블을 표시한다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: YESTERDAY, to: YESTERDAY }} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /Yesterday/ })).toBeInTheDocument()
  })

  it('5개 프리셋이 드롭다운에 표시된다', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: TODAY, to: TODAY }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Today/ }))

    const presets = ['Yesterday', 'Last 7 days', 'Last 30 days', 'This month']
    presets.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
    // 'Today' appears multiple times (trigger button + dropdown), use getAllByText
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0)
  })
})
