'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toolsService } from '@/shared/services'

type RegisteredTool = {
  name: string
  type: 'agent' | 'skill' | 'mcp' | 'hook'
  scope: 'project' | 'global'
  filePath: string
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  agent: { label: 'Agent', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900' },
  skill: { label: 'Skill', color: 'text-pink-700 dark:text-pink-300', bg: 'bg-pink-100 dark:bg-pink-900' },
  mcp: { label: 'MCP', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900' },
  hook: { label: 'Hook', color: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-100 dark:bg-cyan-900' },
}

const SCOPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  project: { label: 'Project', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900' },
  global: { label: 'Global', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900' },
}

export const RegisteredToolsCard = () => {
  const [tools, setTools] = useState<RegisteredTool[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    toolsService.getRegisteredTools()
      .then((data) => {
        setTools((data.tools ?? []) as RegisteredTool[])
        setLoading(false)
      })
      .catch(() => {
        setTools([])
        setLoading(false)
      })
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Registered Tools</CardTitle>
        <CardDescription>
          프로젝트와 홈 디렉토리에서 감지된 에이전트, 스킬, MCP, Hook 도구
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : tools.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
            등록된 도구가 없습니다. .claude/agents/, .claude/skills/, .mcp.json, .claude/settings.json(hooks)을 확인하세요.
          </div>
        ) : (
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[48%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="text-xs text-muted-foreground">
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>File Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.map((tool) => {
                const typeConfig = TYPE_CONFIG[tool.type] ?? { label: tool.type, color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-900' }
                const scopeConfig = SCOPE_CONFIG[tool.scope] ?? { label: tool.scope, color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-900' }
                return (
                  <TableRow key={`${tool.name}-${tool.type}-${tool.scope}`}>
                    <TableCell className="max-w-0">
                      <Tooltip>
                        <TooltipTrigger className="block w-full truncate text-left font-mono text-xs font-medium">
                          {tool.name}
                        </TooltipTrigger>
                        <TooltipContent side="top">{tool.name}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px] px-1.5 py-0', typeConfig.color, typeConfig.bg)}>
                        {typeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px] px-1.5 py-0', scopeConfig.color, scopeConfig.bg)}>
                        {scopeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-0">
                      <Tooltip>
                        <TooltipTrigger className="block w-full truncate text-left font-mono text-xs text-muted-foreground">
                          {tool.filePath}
                        </TooltipTrigger>
                        <TooltipContent side="top">{tool.filePath}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
