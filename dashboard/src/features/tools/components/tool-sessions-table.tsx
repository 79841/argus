'use client'

import Link from 'next/link'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { useLocale } from '@/shared/lib/i18n'
import type { ToolSessionRow } from '@/shared/lib/queries'
import type { AgentType } from '@/shared/lib/agents'

type ToolSessionsTableProps = {
  sessions: ToolSessionRow[]
}

export const ToolSessionsTable = ({ sessions }: ToolSessionsTableProps) => {
  const { t } = useLocale()

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-1">
        <CardTitle className="text-sm font-semibold">{t('tools.detail.relatedSessions')}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('tools.detail.noData')}</p>
        ) : (
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[20%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[19%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="text-xs text-muted-foreground">
                <TableHead>{t('tools.detail.session')}</TableHead>
                <TableHead>{t('tools.detail.project')}</TableHead>
                <TableHead className="text-right">{t('tools.detail.calls')}</TableHead>
                <TableHead className="text-right">{t('tools.detail.success')}</TableHead>
                <TableHead className="text-right">{t('tools.detail.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => {
                const successRate = s.call_count > 0
                  ? Math.round((s.success_count / s.call_count) * 100)
                  : 0
                return (
                  <TableRow key={s.session_id}>
                    <TableCell className="max-w-0">
                      <div className="flex items-center gap-2">
                        <AgentBadge agent={s.agent_type as AgentType} />
                        <Link
                          href={`/sessions/${encodeURIComponent(s.session_id)}`}
                          className="block truncate font-mono text-xs text-primary hover:underline"
                        >
                          {s.session_id}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="truncate text-xs text-muted-foreground">
                      {s.project_name || '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {s.call_count}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <span className={successRate >= 80 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {successRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {s.date}
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
