import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { pings } from '~~/server/db/schema/pings'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const status = query.status as 'online' | 'offline' | null

  const conditions = dateRangeConditions(pings.timestamp, query)

  if (status) {
    conditions.push(eq(pings.status, status))
  }
  const where = and(...conditions)

  const result = await paginate({
    fetchData: (pageLimit, offset) => db.select().from(pings).where(where).orderBy(desc(pings.timestamp)).limit(pageLimit).offset(offset),
    fetchTotal: () => db.select({
      total: count(),
    }).from(pings).where(where),
  }, { page, limit })

  return result
})
