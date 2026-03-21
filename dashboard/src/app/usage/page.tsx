'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AgentFilter } from '@/components/agent-filter'
import { ProjectFilter } from '@/components/project-filter'
import { DateRangePicker } from '@/components/date-range-picker'
import { FilterBar } from '@/components/filter-bar'
import type { AgentType } from '@/lib/agents'
import type { DateRange } from '@/components/top-bar-context'
import { CostTab, TokensTab, ModelsTab, EfficiencyTab, ImpactTab } from '@/features/usage'

const todayISO = () => new Date().toISOString().slice(0, 10)
const daysAgoISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString().slice(0, 10)
}

export default function UsagePage() {
  const [agentType, setAgentType] = useState<AgentType>('all')
  const [project, setProject] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>({ from: daysAgoISO(30), to: todayISO() })

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <AgentFilter value={agentType} onChange={setAgentType} />
        <ProjectFilter value={project} onChange={setProject} />
        <div className="ml-auto">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </FilterBar>

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
            <CostTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="tokens">
            <TokensTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="models">
            <ModelsTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="efficiency">
            <EfficiencyTab project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="impact">
            <ImpactTab dateRange={dateRange} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
