'use client'

import { useState, useEffect, useCallback } from 'react'
import { ConfigTimeline } from '@/components/config-timeline'
import { EmptyState } from '@/components/ui/empty-state'
import { dataClient } from '@/lib/data-client'
import type { DateRange } from '@/components/top-bar-context'
import type { ConfigChange } from '@/lib/config-tracker'

const SCOPE_OPTIONS = ['all', 'project', 'user'] as const
type ScopeType = typeof SCOPE_OPTIONS[number]

type ImpactTabProps = {
  dateRange: DateRange
}

export const ImpactTab = ({ dateRange: _dateRange }: ImpactTabProps) => {
  const [scope, setScope] = useState<ScopeType>('all')
  const [configData, setConfigData] = useState<ConfigChange[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    dataClient.query('config-history', { days: 90 })
      .then((data) => {
        const typedData = data as ConfigChange[]
        const isUserScope = (fp: string) =>
          fp.startsWith('~') || fp.startsWith('/Users') || fp.startsWith('/home') || /^[A-Z]:\\Users\\/i.test(fp)

        const filtered = scope === 'all'
          ? typedData
          : typedData.filter(c => {
            const isUser = isUserScope(c.file_path)
            return scope === 'user' ? isUser : !isUser
          })
        setConfigData(filtered)
      })
      .catch(() => setConfigData([]))
      .finally(() => setLoading(false))
  }, [scope])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Scope:</span>
        <div className="flex gap-1">
          {SCOPE_OPTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                scope === s
                  ? 'bg-primary text-primary-foreground'
                  : 'border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading...</div>
      ) : configData.length === 0 ? (
        <EmptyState title="No config changes" description="Config history will appear here after changes are detected." />
      ) : (
        <ConfigTimeline data={configData} />
      )}
    </div>
  )
}
