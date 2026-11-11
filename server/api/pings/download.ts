import { and, desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { pings } from '~~/server/db/schema/pings'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const status = query.status as 'online' | 'offline' | null

    const conditions = dateRangeConditions(pings.timestamp, {
      start: query.start && query.start !== 'null'
        ? query.start as string
        : undefined,
      end: query.end && query.end !== 'null'
        ? query.end as string
        : undefined,
    })

    if (status) {
      conditions.push(eq(pings.status, status))
    }

    const result = await db.select().from(pings).where(and(...conditions)).orderBy(desc(pings.timestamp))

    exportToCsv(event, result, {
      filename: 'pings.csv',
      headers: [
        'host',
        'status',
        'latency',
        'timestamp',
      ],
      formatRow: row => [
        row.host || '',
        row.status || '',
        row.latency?.toString() || '0',
        new Date(row.timestamp).toISOString(),
      ],
    })

    // Note: exportToCsv handles the response, so we don't return anything
  }
  catch (error) {
    console.error('Ping CSV export error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to export ping data',
    })
  }
})
