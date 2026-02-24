import type { TableColumn } from '@nuxt/ui'

/**
 * Creates a standard ID column for data tables
 */
export function createIdColumn<T extends { id: number | string }>(): TableColumn<T> {
  return {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => `#${row.getValue('id')}`,
  }
}

/**
 * Creates a standard timestamp column with consistent formatting
 */
export function createTimestampColumn<T extends { timestamp: string }>(): TableColumn<T> {
  return {
    accessorKey: 'timestamp',
    header: 'Date',
    cell: ({ row }) =>
      new Date(row.getValue('timestamp')).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
  }
}

/**
 * Creates a right-aligned column with custom formatting and color
 */
export function createRightAlignedColumn<T>(
  key: keyof T,
  header: string,
  formatter: (value: any) => string,
  colorClass = 'text-slate-200',
): TableColumn<T> {
  return {
    accessorKey: key as string,
    header,
    cell: ({ row }) => ({
      class: `text-right ${colorClass}`,
      content: formatter(row.getValue(key as string)),
    }),
  }
}

/**
 * Creates a speed column (download/upload) with standard Mbps formatting
 */
export function createSpeedColumn<T>(
  key: keyof T,
  header: string,
  colorClass: string,
): TableColumn<T> {
  return createRightAlignedColumn(key, header, value => `${Number(value).toFixed(2)} Mbps`, colorClass)
}
