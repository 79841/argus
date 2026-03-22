'use client'

import type { MergedToolItem } from '@/features/tools/lib/merge-tools'
import { ToolListTab } from './tool-list-tab'

type SkillsTabProps = {
  data: MergedToolItem[]
}

export const SkillsTab = ({ data }: SkillsTabProps) => (
  <ToolListTab
    data={data}
    emptyTitleKey="tools.detail.emptySkills"
    emptyDescKey="tools.detail.emptySkillsDesc"
    noRegisteredKey="tools.detail.noRegisteredSkills"
  />
)
