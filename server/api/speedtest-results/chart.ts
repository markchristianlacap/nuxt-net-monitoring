import { and, asc } from 'drizzle-orm'
import { db } from '~~/server/db'
import { speedtestResults } from '~~/server/db/schema/speedtest-results'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const where = and(
    ...dateRangeConditions(speedtestResults.timestamp, query),
    getSpeedtestInterfaceFilter(query.networkInterface),
  )

  const data = await db.select().from(speedtestResults).where(where).orderBy(asc(speedtestResults.timestamp))

  return data
})
