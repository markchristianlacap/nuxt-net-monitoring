import { and, desc } from 'drizzle-orm'
import { db } from '~~/server/db'
import { speedtestResults } from '~~/server/db/schema/speedtest-results'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)

    const where = and(
      ...dateRangeConditions(speedtestResults.timestamp, {
        start: query.start && query.start !== 'null'
          ? query.start as string
          : undefined,
        end: query.end && query.end !== 'null'
          ? query.end as string
          : undefined,
      }),
      getSpeedtestInterfaceFilter(query.networkInterface),
    )

    const result = await db.select().from(speedtestResults).where(where).orderBy(desc(speedtestResults.timestamp))

    exportToCsv(event, result, {
      filename: 'speedtest-results.csv',
      headers: [
        'isp',
        'public_ip',
        'download',
        'upload',
        'latency',
        'network_interface',
        'timestamp',
        'url',
      ],
      formatRow: row => [
        row.isp || '',
        row.ip || '',
        row.download?.toString() || '0',
        row.upload?.toString() || '0',
        Number(row.latency || 0)?.toFixed(2) || '0',
        row.networkInterface || '',
        new Date(row.timestamp).toISOString(),
        row.url || '',
      ],
    })

    // Note: exportToCsv handles the response, so we don't return anything
  }
  catch (error) {
    console.error('Speedtest results CSV export error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to export speedtest results',
    })
  }
})
