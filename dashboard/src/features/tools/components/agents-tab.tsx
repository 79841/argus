'use client'

import type { MergedToolItem } from '@/features/tools/lib/merge-tools'
import { ToolListTab } from './tool-list-tab'

type AgentsTabProps = {
  data: MergedToolItem[]
}

export const AgentsTab = ({ data }: AgentsTabProps) => (
  <ToolListTab
    data={data}
    emptyTitle="에이전트 데이터 없음"
    emptyDescription="등록된 에이전트가 없거나 아직 호출 기록이 없습니다."
    noRegisteredLabel="등록된 에이전트 없음"
  />
)
