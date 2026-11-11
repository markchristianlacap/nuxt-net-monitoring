import { and, asc, max, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { bandwidths } from '~~/server/db/schema/bandwidths'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const timeBucket = sql<Date>`DATE_TRUNC('hour', ${bandwidths.timestamp})`
  const where = and(...dateRangeConditions(bandwidths.timestamp, query))

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
