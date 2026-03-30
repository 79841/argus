'use client'

import Link from 'next/link'
import { PackageOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { useLocale } from '@/shared/lib/i18n'
import type { MergedToolItem, MergedMcpServer } from '@/features/tools/lib/merge-tools'

type UnusedToolsCardProps = {
  agents: MergedToolItem[]
  skills: MergedToolItem[]
  mcpServers: MergedMcpServer[]
}

export const UnusedToolsCard = ({ agents, skills, mcpServers }: UnusedToolsCardProps) => {
  const { t } = useLocale()

  const total = agents.length + skills.length + mcpServers.length
  if (total === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageOpen className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{t('dashboard.unusedTools.title')}</CardTitle>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {t('dashboard.unusedTools.count').replace('{0}', String(total))}
            </Badge>
          </div>
          <Link
            href="/tools"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('dashboard.unusedTools.viewAll')}
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="space-y-2">
          {agents.length > 0 && (
            <ToolGroup label={t('dashboard.unusedTools.agents')} items={agents.map((a) => a.name)} />
          )}
          {skills.length > 0 && (
            <ToolGroup label={t('dashboard.unusedTools.skills')} items={skills.map((s) => s.name)} />
          )}
          {mcpServers.length > 0 && (
            <ToolGroup label={t('dashboard.unusedTools.mcp')} items={mcpServers.map((m) => m.serverName)} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const ToolGroup = ({ label, items }: { label: string; items: string[] }) => (
  <div className="flex items-start gap-2">
    <span className="text-xs text-muted-foreground shrink-0 w-16 pt-0.5">{label}</span>
    <div className="flex flex-wrap gap-1">
      {items.map((name) => (
        <Badge key={name} variant="outline" className="text-[11px] px-1.5 py-0 font-mono">
          {name}
        </Badge>
      ))}
    </div>
  </div>
)
