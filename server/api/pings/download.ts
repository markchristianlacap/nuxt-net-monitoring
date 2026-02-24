import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const status = query.status as 'online' | 'offline' | null

    let baseQuery = db.selectFrom('pings')
      .selectAll()
      .orderBy('timestamp', 'desc')

    baseQuery = applyDateRangeFilter(baseQuery, {
      start: query.start && query.start !== 'null' ? query.start as string : undefined,
      end: query.end && query.end !== 'null' ? query.end as string : undefined,
    })

    if (status) {
      baseQuery = baseQuery.where('status', '=', status)
    }

    const result = await baseQuery.execute()

    exportToCsv(event, result, {
      filename: 'pings.csv',
      headers: ['host', 'status', 'latency', 'timestamp'],
      formatRow: row => [
        row.host || '',
        row.status || '',
        row.latency?.toString() || '0',
        new Date(row.timestamp).toISOString(),
      ],
    })

    // Note: exportToCsv handles the response, so we don't return anything
  } catch (error) {
    console.error('Ping CSV export error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to export ping data',
    })
  }
})
