import { and, desc } from 'drizzle-orm'
import { db } from '~~/server/db'
import { bandwidths } from '~~/server/db/schema/bandwidths'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)

    const where = and(...dateRangeConditions(bandwidths.timestamp, {
      start: query.start && query.start !== 'null'
        ? query.start as string
        : undefined,
      end: query.end && query.end !== 'null'
        ? query.end as string
        : undefined,
    }))

    const result = await db.select().from(bandwidths).where(where).orderBy(desc(bandwidths.timestamp))

    exportToCsv(event, result, {
      filename: 'bandwidths.csv',
      headers: [
        'displayName',
        'host',
        'interface',
        'inMbps',
        'outMbps',
        'timestamp',
      ],
      formatRow: row => [
        row.displayName || row.host || '',
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
