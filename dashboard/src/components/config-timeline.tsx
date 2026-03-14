'use client'

import { useState } from 'react'
import type { ConfigChange } from '@/lib/config-tracker'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAgentColor } from '@/lib/agents'
import { cn } from '@/lib/utils'

type ConfigTimelineProps = {
  data: ConfigChange[]
}

const DiffLine = ({ line }: { line: string }) => {
  if (line.startsWith('+') && !line.startsWith('+++')) {
    return <div className="bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300">{line}</div>
  }
  if (line.startsWith('-') && !line.startsWith('---')) {
    return <div className="bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300">{line}</div>
  }
  if (line.startsWith('@@')) {
    return <div className="text-blue-600 dark:text-blue-400">{line}</div>
  }
  return <div>{line}</div>
}

export const ConfigTimeline = ({ data }: ConfigTimelineProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <p>설정 변경 이력이 없습니다.</p>
      </div>
    )
  }

  const selected = selectedIndex !== null ? data[selectedIndex] : null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      {/* Left: Timeline */}
      <div className="relative ml-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />

        {data.map((change, index) => {
          const agentHex = getAgentColor(change.agent_type)
          const isSelected = selectedIndex === index
          const dateStr = new Date(change.date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <div key={`${change.commit_hash}-${change.file_path}`} className="relative pl-8 pb-3">
              <div
                className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background"
                style={{ backgroundColor: agentHex }}
              />

              <button
                type="button"
                onClick={() => setSelectedIndex(isSelected ? null : index)}
                className={cn(
                  'w-full text-left cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50',
                  isSelected && 'border-primary bg-muted/50 ring-1 ring-primary'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{dateStr}</span>
                  <Badge
                    className="text-[10px] px-1.5 py-0"
                    style={{ backgroundColor: agentHex, color: 'white' }}
                  >
                    {change.agent_type}
                  </Badge>
                </div>

                <div className="font-medium text-sm">{change.file_path}</div>

                <div className="text-xs text-muted-foreground mt-1 truncate">
                  <span className="font-mono text-[10px]">{change.commit_hash.slice(0, 7)}</span>
                  {' '}
                  {change.commit_message}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Right: Diff Panel */}
      <Card className="max-h-[calc(100vh-200px)] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {selected ? selected.file_path : 'Diff Viewer'}
          </CardTitle>
          {selected && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge
                className="text-[10px] px-1.5 py-0"
                style={{ backgroundColor: getAgentColor(selected.agent_type), color: 'white' }}
              >
                {selected.agent_type}
              </Badge>
              <span className="font-mono">{selected.commit_hash.slice(0, 7)}</span>
              <span>{selected.commit_message}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {selected ? (
            selected.diff ? (
              <pre className="overflow-auto h-full rounded-md border bg-muted/30 p-4 text-xs font-mono leading-5">
                {selected.diff.split('\n').map((line, i) => (
                  <DiffLine key={i} line={line} />
                ))}
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                diff 데이터가 없습니다.
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              좌측 타임라인에서 항목을 선택하면 diff가 표시됩니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
