'use client'

import { useEffect, useState } from 'react'
import type { ConfigChange } from '@/lib/config-tracker'
import { ConfigTimeline } from '@/components/config-timeline'

export default function ConfigHistoryPage() {
  const [data, setData] = useState<ConfigChange[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/config-history?days=30')
        const json = await res.json()
        setData(json)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Config History</h1>
        <p className="text-muted-foreground mt-1">
          AI 에이전트 설정 파일의 Git 변경 이력을 추적합니다. 최근 30일간의 변경사항을 표시합니다.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <p>로딩 중...</p>
        </div>
      ) : (
        <ConfigTimeline data={data} />
      )}
    </div>
  )
}
