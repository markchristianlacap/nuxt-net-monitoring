import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)

    let baseQuery = db.selectFrom('bandwidths')
      .selectAll()
      .orderBy('timestamp', 'desc')

    baseQuery = applyDateRangeFilter(baseQuery, {
      start: query.start && query.start !== 'null' ? query.start as string : undefined,
      end: query.end && query.end !== 'null' ? query.end as string : undefined,
    })

    const result = await baseQuery.execute()

    exportToCsv(event, result, {
      filename: 'bandwidths.csv',
      headers: ['host', 'interface', 'inMbps', 'outMbps', 'timestamp'],
      formatRow: row => [
        row.host || '',
        row.interface || '',
        row.inMbps?.toString() || '0',
        row.outMbps?.toString() || '0',
        new Date(row.timestamp).toISOString(),
      ],
    })

    // Note: exportToCsv handles the response, so we don't return anything
  }
  catch (error) {
    console.error('Bandwidth CSV export error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to export bandwidth data',
    })
  }
})
