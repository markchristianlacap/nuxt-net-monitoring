import { db } from '~~/server/db'
import { applyDateRangeFilter } from '~~/server/utils/query-filters'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10

  let baseQuery = db.selectFrom('speedtest_results')
    .selectAll()
    .orderBy('timestamp', 'desc')

  baseQuery = applyDateRangeFilter(baseQuery, query)

  const result = await paginate(db, baseQuery, { page, limit })

  return result
})
