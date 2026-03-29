'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import { AgentFilter } from '@/shared/components/agent-filter'
import { ProjectFilter } from '@/shared/components/project-filter'
import { DateRangePicker } from '@/shared/components/date-range-picker'
import { FilterBar } from '@/shared/components/filter-bar'
import { todayISO, daysAgoISO } from '@/shared/lib/format'
import type { AgentType } from '@/shared/lib/agents'
import type { DateRange } from '@/shared/components/top-bar-context'
import { CostTab, TokensTab, ModelsTab, EfficiencyTab, ImpactTab } from '@/features/usage'

export default function UsagePage() {
  const [agentType, setAgentType] = useState<AgentType>('all')
  const [project, setProject] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>({ from: daysAgoISO(30), to: todayISO() })

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <FilterBar>
        <AgentFilter value={agentType} onChange={setAgentType} />
        <ProjectFilter value={project} onChange={setProject} />
        <div className="ml-auto">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </FilterBar>

      <Tabs defaultValue="cost" className="flex flex-1 min-h-0 flex-col">
        <div className="flex-shrink-0 overflow-x-auto px-4 pt-4 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="flex-nowrap">
            <TabsTrigger value="cost" className="flex-shrink-0">Cost</TabsTrigger>
            <TabsTrigger value="tokens" className="flex-shrink-0">Tokens</TabsTrigger>
            <TabsTrigger value="models" className="flex-shrink-0">Models</TabsTrigger>
            <TabsTrigger value="efficiency" className="flex-shrink-0">Efficiency</TabsTrigger>
            <TabsTrigger value="impact" className="flex-shrink-0">Impact</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4">
          <TabsContent value="cost">
            <CostTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="tokens">
            <TokensTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="models">
            <ModelsTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="efficiency">
            <EfficiencyTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="impact">
            <ImpactTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
