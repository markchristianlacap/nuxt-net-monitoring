import type { H3Event } from 'h3'
import { setHeader } from 'h3'

export interface CsvExportOptions<T = any> {
  filename: string
  headers: string[]
  formatRow: (row: T) => string[]
}

/**
 * Export data as CSV
 * @param event - H3 event object
 * @param data - Array of data to export
 * @param options - Export configuration
 */
export function exportToCsv<T = any>(
  event: H3Event,
  data: T[],
  options: CsvExportOptions<T>,
): void {
  setHeader(event, 'Content-Type', 'text/csv')
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${options.filename}"`,
  )

  // Write headers
  event.node.res.write(`${options.headers.join(',')}\n`)

  // Write data rows
  data.forEach((row) => {
    const values = options.formatRow(row)
    event.node.res.write(`${values.join(',')}\n`)
  })

  event.node.res.end()
}
