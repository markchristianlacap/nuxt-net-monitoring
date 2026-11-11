import { and, asc, eq, max, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { bandwidths } from '~~/server/db/schema/bandwidths'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const timeBucket = sql<Date>`DATE_TRUNC('hour', ${bandwidths.timestamp})`
  const conditions = dateRangeConditions(bandwidths.timestamp, query)
  if (typeof query.host === 'string' && query.host)
    conditions.push(eq(bandwidths.host, query.host))
  const where = and(...conditions)

  const data = await db.select({
    time_bucket: timeBucket,
    host: bandwidths.host,
    displayName: bandwidths.displayName,
    interface: bandwidths.interface,
    avg_download: sql<number | null>`AVG(${bandwidths.inMbps})`,
    avg_upload: sql<number | null>`AVG(${bandwidths.outMbps})`,
    max_download: max(bandwidths.inMbps),
    max_upload: max(bandwidths.outMbps),
  })
    .from(bandwidths)
    .where(where)
    .groupBy(timeBucket, bandwidths.host, bandwidths.displayName, bandwidths.interface)
    .orderBy(asc(timeBucket))

  return data
})
