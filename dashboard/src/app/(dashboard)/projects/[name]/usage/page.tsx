'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import { AgentFilter } from '@/shared/components/agent-filter'
import { DateRangePicker } from '@/shared/components/date-range-picker'
import { todayISO, daysAgoISO } from '@/shared/lib/format'
import type { AgentType } from '@/shared/lib/agents'
import type { DateRange } from '@/shared/components/top-bar-context'
import { CostTab, TokensTab, ModelsTab, EfficiencyTab, ImpactTab } from '@/features/usage'

export default function ProjectUsagePage() {
  const params = useParams()
  const projectName = decodeURIComponent(params.name as string)

  const [agentType, setAgentType] = useState<AgentType>('all')
  const [dateRange, setDateRange] = useState<DateRange>({ from: daysAgoISO(30), to: todayISO() })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2">
        <AgentFilter value={agentType} onChange={setAgentType} />
        <div className="ml-auto">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        <Tabs defaultValue="cost" className="h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="cost">Cost</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="cost">
            <CostTab agentType={agentType} project={projectName} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="tokens">
            <TokensTab agentType={agentType} project={projectName} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="models">
            <ModelsTab agentType={agentType} project={projectName} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="efficiency">
            <EfficiencyTab agentType={agentType} project={projectName} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="impact">
            <ImpactTab agentType={agentType} project={projectName} dateRange={dateRange} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
