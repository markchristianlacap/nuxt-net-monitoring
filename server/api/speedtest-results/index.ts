import { and, count, desc } from 'drizzle-orm'
import { db } from '~~/server/db'
import { speedtestResults } from '~~/server/db/schema/speedtest-results'
import { getSpeedtestInterfaceFilter } from '../../utils/speedtest-result-filter'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10

  const where = and(
    ...dateRangeConditions(speedtestResults.timestamp, query),
    getSpeedtestInterfaceFilter(query.networkInterface),
  )

  const result = await paginate({
    fetchData: (pageLimit, offset) => db.select().from(speedtestResults).where(where).orderBy(desc(speedtestResults.timestamp)).limit(pageLimit).offset(offset),
    fetchTotal: () => db.select({
      total: count(),
    }).from(speedtestResults).where(where),
  }, { page, limit })

  return result
})
