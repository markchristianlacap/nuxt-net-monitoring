import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { bandwidths } from '~~/server/db/schema/bandwidths'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const conditions = dateRangeConditions(bandwidths.timestamp, query)
  if (typeof query.host === 'string' && query.host)
    conditions.push(eq(bandwidths.host, query.host))

  const where = and(...conditions)

  const result = await paginate({
    fetchData: (pageLimit, offset) => db.select().from(bandwidths).where(where).orderBy(desc(bandwidths.timestamp)).limit(pageLimit).offset(offset),
    fetchTotal: () => db.select({
      total: count(),
    }).from(bandwidths).where(where),
  }, { page, limit })

  return result
})
