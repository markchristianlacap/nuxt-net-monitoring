import { asc } from 'drizzle-orm'
import { db } from '~~/server/db'
import { speedtestResults } from '~~/server/db/schema/speedtest-results'

export default defineEventHandler(async () => {
  const rows = await db.selectDistinct({ networkInterface: speedtestResults.networkInterface })
    .from(speedtestResults)
    .orderBy(asc(speedtestResults.networkInterface))

  return {
    interfaces: rows.flatMap(row => row.networkInterface
      ? [row.networkInterface]
      : []),
    hasLegacyResults: rows.some(row => row.networkInterface === null),
  }
})
