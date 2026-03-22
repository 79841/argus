'use client'

import { useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import type { IndividualToolRow } from '@/shared/lib/queries'
import { mergeTools, mergeMcpTools } from '../lib/merge-tools'
import type { RegisteredTool } from '../lib/merge-tools'
import { SkillsTab } from './skills-tab'
import { AgentsTab } from './agents-tab'
import { McpTab } from './mcp-tab'

type DetailsSectionProps = {
  individual: IndividualToolRow[]
  registered: RegisteredTool[]
}

export const DetailsSection = ({ individual, registered }: DetailsSectionProps) => {
  const mergedSkills = useMemo(() => mergeTools(registered, individual, 'skill'), [registered, individual])
  const mergedAgents = useMemo(() => mergeTools(registered, individual, 'agent'), [registered, individual])
  const mergedMcp = useMemo(() => mergeMcpTools(registered, individual), [registered, individual])

  return (
    <Tabs defaultValue="skills">
      <TabsList>
        <TabsTrigger value="skills">Skills</TabsTrigger>
        <TabsTrigger value="agents">Agents</TabsTrigger>
        <TabsTrigger value="mcp">MCP</TabsTrigger>
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
