import type { H3Event } from 'h3'
import { setHeader, createError } from 'h3'

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
  try {
    // Check if response has already been started
    if (event.node.res.headersSent) {
      console.warn('CSV export attempted on response with headers already sent')
      return
    }

    // Validate data
    if (!Array.isArray(data)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid data format for CSV export',
      })
    }

    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="${options.filename}"`,
    )

    // Add cache control headers to prevent caching
    setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
    setHeader(event, 'Pragma', 'no-cache')
    setHeader(event, 'Expires', '0')

    // Write CSV headers
    const csvHeaders = options.headers.map(header => `"${header}"`).join(',')
    event.node.res.write(`${csvHeaders}\n`)

    // Write data rows
    data.forEach((row, index) => {
      try {
        const values = options.formatRow(row)
        // Escape CSV values and wrap in quotes to handle commas and special characters
        const escapedValues = values.map(value => {
          if (value === null || value === undefined) return '""'
          const stringValue = String(value).replace(/"/g, '""') // Escape quotes
          return `"${stringValue}"`
        })
        event.node.res.write(`${escapedValues.join(',')}\n`)
      } catch (rowError) {
        console.error(`Error formatting CSV row ${index}:`, rowError)
        // Skip malformed rows instead of failing the entire export
      }
    })

    event.node.res.end()
  } catch (error) {
    console.error('CSV export error:', error)
    
    // Only send error response if headers haven't been sent yet
    if (!event.node.res.headersSent) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate CSV export',
      })
    }
  }
}
