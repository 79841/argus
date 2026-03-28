'use client'

import type { ReactNode } from 'react'
import { EmptyState } from '@/shared/components/ui/empty-state'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/shared/components/ui/table'
import { cn } from '@/shared/lib/utils'
import { useLocale } from '@/shared/lib/i18n'

type Column<T = Record<string, unknown>> = {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  format?: (value: unknown, row: T) => string | ReactNode
  width?: string
}

type DataTableProps<T = Record<string, unknown>> = {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  highlightOnHover?: boolean
  stickyHeader?: boolean
  onRowClick?: (row: T) => void
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export const DataTable = <T = Record<string, unknown>>({
  columns,
  data,
  emptyMessage,
  highlightOnHover = true,
  stickyHeader = false,
  onRowClick,
}: DataTableProps<T>) => {
  const { t } = useLocale()
  if (data.length === 0) {
    return <EmptyState title={emptyMessage ?? t('shared.dataTable.noData')} />
  }

  return (
    <Table>
      <TableHeader className={stickyHeader ? 'sticky top-0 z-10' : ''}>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
                alignClass[col.align ?? 'left']
              )}
              style={col.width ? { width: col.width } : undefined}
            >
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, rowIndex) => (
          <TableRow
            key={rowIndex}
            className={cn(
              !highlightOnHover && 'hover:bg-transparent',
              onRowClick && 'cursor-pointer'
            )}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((col) => (
              <TableCell
                key={col.key}
                className={cn(
                  'tabular-nums',
                  alignClass[col.align ?? 'left']
                )}
              >
                {col.format
                  ? col.format((row as Record<string, unknown>)[col.key], row)
                  : ((row as Record<string, unknown>)[col.key] as string | number | null | undefined) ?? '—'}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export type { Column, DataTableProps }
