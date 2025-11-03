import { db } from '~~/server/db'
import { applyDateRangeFilter } from '~~/server/utils/query-filters'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  let baseQuery = db.selectFrom('speedtest_results')
    .selectAll()
    .orderBy('timestamp', 'asc')

  baseQuery = applyDateRangeFilter(baseQuery, query)

  const data = await baseQuery.execute()

  return data
})
