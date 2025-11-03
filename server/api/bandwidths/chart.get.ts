import { sql } from 'kysely'
import { db } from '~~/server/db'
import { applyDateRangeFilter } from '~~/server/utils/query-filters'

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

  baseQuery = applyDateRangeFilter(baseQuery, query)

  const data = await baseQuery.execute()

  return data
})
