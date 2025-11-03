import { sql } from 'kysely'
import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  let baseQuery = db.selectFrom('bandwidths')
    .select([
      sql<string>`DATE_TRUNC('hour', timestamp)`.as('time_bucket'),
      'host',
      'interface',
      sql<number>`AVG("inMbps")`.as('avg_download'),
      sql<number>`AVG("outMbps")`.as('avg_upload'),
      sql<number>`MAX("inMbps")`.as('max_download'),
      sql<number>`MAX("outMbps")`.as('max_upload'),
    ])
    .groupBy(['time_bucket', 'host', 'interface'])
    .orderBy('time_bucket', 'asc')

  if (query.start) {
    const start = new Date(query.start as string)
    start.setUTCHours(0, 0, 0, 0)
    baseQuery = baseQuery.where('timestamp', '>=', start)
  }
  if (query.end) {
    const end = new Date(query.end as string)
    end.setUTCHours(23, 59, 59, 999)
    baseQuery = baseQuery.where('timestamp', '<=', end)
  }

  const data = await baseQuery.execute()

  return data
})
