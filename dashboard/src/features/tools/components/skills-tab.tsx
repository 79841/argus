'use client'

import type { MergedToolItem } from '@/features/tools/lib/merge-tools'
import { ToolListTab } from './tool-list-tab'

type SkillsTabProps = {
  data: MergedToolItem[]
}

export const SkillsTab = ({ data }: SkillsTabProps) => (
  <ToolListTab
    data={data}
    emptyTitle="스킬 데이터 없음"
    emptyDescription="등록된 스킬이 없거나 아직 호출 기록이 없습니다."
    noRegisteredLabel="등록된 스킬 없음"
  />
)
