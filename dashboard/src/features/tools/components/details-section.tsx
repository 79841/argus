'use client'

import { useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import type { IndividualToolRow } from '@/shared/lib/queries'
import { mergeTools, mergeMcpTools } from '../lib/merge-tools'
import type { RegisteredTool } from '@/shared/lib/registered-tools'
import { useLocale } from '@/shared/lib/i18n'
import { SkillsTab } from './skills-tab'
import { AgentsTab } from './agents-tab'
import { McpTab } from './mcp-tab'

type DetailsSectionProps = {
  individual: IndividualToolRow[]
  registered: RegisteredTool[]
}

export const DetailsSection = ({ individual, registered }: DetailsSectionProps) => {
  const { t } = useLocale()
  const mergedSkills = useMemo(() => mergeTools(registered, individual, 'skill'), [registered, individual])
  const mergedAgents = useMemo(() => mergeTools(registered, individual, 'agent'), [registered, individual])
  const mergedMcp = useMemo(() => mergeMcpTools(registered, individual), [registered, individual])

  return (
    <Tabs defaultValue="skills">
      <TabsList>
        <TabsTrigger value="skills">{t('tools.details.tab.skills')}</TabsTrigger>
        <TabsTrigger value="agents">{t('tools.details.tab.agents')}</TabsTrigger>
        <TabsTrigger value="mcp">{t('tools.details.tab.mcp')}</TabsTrigger>
      </TabsList>
      <TabsContent value="skills">
        <SkillsTab data={mergedSkills} />
      </TabsContent>
      <TabsContent value="agents">
        <AgentsTab data={mergedAgents} />
      </TabsContent>
      <TabsContent value="mcp">
        <McpTab data={mergedMcp} />
      </TabsContent>
    </Tabs>
  )
}
