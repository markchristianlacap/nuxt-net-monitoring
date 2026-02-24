import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)

    let baseQuery = db.selectFrom('speedtest_results')
      .selectAll()
      .orderBy('timestamp', 'desc')

    baseQuery = applyDateRangeFilter(baseQuery, {
      start: query.start && query.start !== 'null' ? query.start as string : undefined,
      end: query.end && query.end !== 'null' ? query.end as string : undefined,
    })

    const result = await baseQuery.execute()

    exportToCsv(event, result, {
      filename: 'speedtest-results.csv',
      headers: ['isp', 'public_ip', 'download', 'upload', 'latency', 'timestamp', 'url'],
      formatRow: row => [
        row.isp || '',
        row.ip || '',
        row.download?.toString() || '0',
        row.upload?.toString() || '0',
        Number(row.latency || 0)?.toFixed(2) || '0',
        new Date(row.timestamp).toISOString(),
        row.url || '',
      ],
    })

    // Note: exportToCsv handles the response, so we don't return anything
  } catch (error) {
    console.error('Speedtest results CSV export error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to export speedtest results',
    })
  }
})
