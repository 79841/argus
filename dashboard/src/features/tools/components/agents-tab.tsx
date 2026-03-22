'use client'

import type { MergedToolItem } from '@/features/tools/lib/merge-tools'
import { ToolListTab } from './tool-list-tab'

type AgentsTabProps = {
  data: MergedToolItem[]
}

export const AgentsTab = ({ data }: AgentsTabProps) => (
  <ToolListTab
    data={data}
    emptyTitleKey="tools.detail.emptyAgents"
    emptyDescKey="tools.detail.emptyAgentsDesc"
    noRegisteredKey="tools.detail.noRegisteredAgents"
  />
)
