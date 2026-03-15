import type { ReactNode } from 'react'
import { EmptyState } from '@/components/ui/empty-state'

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
}: DataTableProps) => {
  if (data.length === 0) {
    return <EmptyState title={emptyMessage ?? 'No data'} />
  }

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
          <tr className="bg-[var(--bg-sunken)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  'px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
                  alignClass[col.align ?? 'left'],
                ].join(' ')}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={[
                'border-b border-[var(--border-subtle)]',
                highlightOnHover ? 'hover:bg-[var(--fill-hover)]' : '',
              ].join(' ')}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[
                    'px-4 py-2 tabular-nums',
                    alignClass[col.align ?? 'left'],
                  ].join(' ')}
                >
                  {col.format
                    ? col.format(row[col.key], row)
                    : (row[col.key] as string | number | null | undefined) ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
