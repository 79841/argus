import type { ReactNode } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Column = {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  format?: (value: unknown, row: Record<string, unknown>) => string | ReactNode
  width?: string
}

type DataTableProps = {
  columns: Column[]
  data: Record<string, unknown>[]
  emptyMessage?: string
  highlightOnHover?: boolean
  stickyHeader?: boolean
  onRowClick?: (row: Record<string, unknown>) => void
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export const DataTable = ({
  columns,
  data,
  emptyMessage,
  highlightOnHover = true,
  stickyHeader = false,
  onRowClick,
}: DataTableProps) => {
  if (data.length === 0) {
    return <EmptyState title={emptyMessage ?? 'No data'} />
  }

  return (
    <Table>
      <TableHeader className={stickyHeader ? 'sticky top-0 z-10' : ''}>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
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
                  ? col.format(row[col.key], row)
                  : (row[col.key] as string | number | null | undefined) ?? '—'}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export type { Column, DataTableProps }
