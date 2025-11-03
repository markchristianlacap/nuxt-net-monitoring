import { db } from '~~/server/db'
import { applyDateRangeFilter } from '~~/server/utils/query-filters'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const status = query.status as 'online' | 'offline' | null

  let baseQuery = db.selectFrom('pings')
    .selectAll()
    .orderBy('timestamp', 'desc')

  baseQuery = applyDateRangeFilter(baseQuery, query)

  if (status) {
    baseQuery = baseQuery.where('status', '=', status)
  }

  const result = await paginate(db, baseQuery, { page, limit })

  return result
})
