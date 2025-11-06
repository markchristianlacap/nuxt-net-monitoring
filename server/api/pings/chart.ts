import { sql } from 'kysely'
import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = query.status as 'online' | 'offline' | null

  let baseQuery = db.selectFrom('pings')
    .select([
      sql<string>`DATE_TRUNC('hour', timestamp)`.as('time_bucket'),
      'host',
      'status',
      sql<number>`AVG(latency)`.as('avg_latency'),
      sql<number>`MAX(latency)`.as('max_latency'),
      sql<number>`MIN(latency)`.as('min_latency'),
      sql<number>`COUNT(*)`.as('count'),
    ])
    .groupBy(['time_bucket', 'host', 'status'])
    .orderBy('time_bucket', 'asc')

  baseQuery = applyDateRangeFilter(baseQuery, query)

  if (status) {
    baseQuery = baseQuery.where('status', '=', status)
  }

  const data = await baseQuery.execute()

  return data
})
