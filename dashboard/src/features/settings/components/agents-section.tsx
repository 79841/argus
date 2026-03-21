'use client'

import { Save, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { useLocale } from '@/shared/lib/i18n'
import { useAgentLimits } from '../hooks/use-agent-limits'

export const AgentsSection = () => {
  const { t } = useLocale()
  const { limits, saving, saved, agentTypes, handleChange, handleSave } = useAgentLimits()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Cost Limits
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Coming soon</Badge>
          </CardTitle>
          <CardDescription>
            {t('settings.agents.costLimits.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow className="text-xs text-muted-foreground">
                <TableHead className="w-[30%]">Agent</TableHead>
                <TableHead className="w-[35%]">Daily Limit ($)</TableHead>
                <TableHead className="w-[35%]">Monthly Limit ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentTypes.map((agent) => {
                const limit = limits.find((l) => l.agent_type === agent.id)
                return (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 text-sm font-medium">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: `var(--agent-${agent.id})` }}
                        />
                        {agent.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled
                        value={limit?.daily_cost_limit ?? '0'}
                        onChange={(e) => handleChange(agent.id, 'daily_cost_limit', e.target.value)}
                        className="w-full rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground cursor-not-allowed focus:outline-none"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled
                        value={limit?.monthly_cost_limit ?? '0'}
                        onChange={(e) => handleChange(agent.id, 'monthly_cost_limit', e.target.value)}
                        className="w-full rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground cursor-not-allowed focus:outline-none"
                        placeholder="0.00"
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled variant="outline" size="sm">
              <Save className="size-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400">
                <Check className="size-3.5 inline mr-1" />
                Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collection Status</CardTitle>
          <CardDescription>
            {t('settings.agents.collection.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon &mdash; 수집 상태 모니터링.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
