'use client'

import { useState, useRef, useEffect } from 'react'
import type { DateRange } from '@/shared/components/top-bar-context'

type Preset = {
  label: string
  getRange: () => DateRange
}

const todayISO = () => new Date().toISOString().slice(0, 10)

const daysAgoISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString().slice(0, 10)
}

const yesterdayISO = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

const firstOfMonthISO = () => {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

const PRESETS: Preset[] = [
  { label: 'Today', getRange: () => ({ from: todayISO(), to: todayISO() }) },
  { label: 'Yesterday', getRange: () => ({ from: yesterdayISO(), to: yesterdayISO() }) },
  { label: 'Last 7 days', getRange: () => ({ from: daysAgoISO(7), to: todayISO() }) },
  { label: 'Last 30 days', getRange: () => ({ from: daysAgoISO(30), to: todayISO() }) },
  { label: 'This month', getRange: () => ({ from: firstOfMonthISO(), to: todayISO() }) },
]

const formatDisplay = (range: DateRange): string => {
  const today = todayISO()
  const yesterday = yesterdayISO()

  if (range.from === today && range.to === today) return 'Today'
  if (range.from === yesterday && range.to === yesterday) return 'Yesterday'

  for (const preset of PRESETS) {
    const pr = preset.getRange()
    if (pr.from === range.from && pr.to === range.to) return preset.label
  }

  const fmtDate = (iso: string) => {
    const [, m, d] = iso.split('-')
    return `${parseInt(m)}/${parseInt(d)}`
  }
  return `${fmtDate(range.from)} - ${fmtDate(range.to)}`
}

type DateRangePickerProps = {
  value: DateRange
  onChange: (range: DateRange) => void
}

export const DateRangePicker = ({ value, onChange }: DateRangePickerProps) => {
  const [open, setOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(value.from)
  const [customTo, setCustomTo] = useState(value.to)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCustomFrom(value.from)
    setCustomTo(value.to)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handlePreset = (preset: Preset) => {
    onChange(preset.getRange())
    setOpen(false)
  }

  const handleCustomApply = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      onChange({ from: customFrom, to: customTo })
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => setOpen(!open)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
        {formatDisplay(value)}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border bg-popover p-3 shadow-md">
          <div className="space-y-1">
            {PRESETS.map((preset) => {
              const pr = preset.getRange()
              const isActive = pr.from === value.from && pr.to === value.to
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => handlePreset(preset)}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          <div className="mt-3 border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">Custom Range</div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={todayISO()}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              />
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={!customFrom || !customTo || customFrom > customTo}
              onClick={handleCustomApply}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
