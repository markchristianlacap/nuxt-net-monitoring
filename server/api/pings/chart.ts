import { and, asc, count, eq, max, min, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { pings } from '~~/server/db/schema/pings'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = query.status as 'online' | 'offline' | null

  const timeBucket = sql<Date>`DATE_TRUNC('hour', ${pings.timestamp})`
  const conditions = dateRangeConditions(pings.timestamp, query)

  if (status) {
    conditions.push(eq(pings.status, status))
  }
  const where = and(...conditions)

  const data = await db.select({
    time_bucket: timeBucket,
    host: pings.host,
    status: pings.status,
    avg_latency: sql<number | null>`AVG(${pings.latency})`,
    max_latency: max(pings.latency),
    min_latency: min(pings.latency),
    count: count(),
  })
    .from(pings)
    .where(where)
    .groupBy(timeBucket, pings.host, pings.status)
    .orderBy(asc(timeBucket))

  return data
})
