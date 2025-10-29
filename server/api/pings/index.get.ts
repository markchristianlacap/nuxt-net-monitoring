import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const status = query.status as 'online' | 'offline' | null
  let baseQuery = db.selectFrom('pings')
    .selectAll()
    .orderBy('timestamp', 'desc')
  if (query.start) {
    const start = new Date(query.start as string)
    start.setUTCHours(0, 0, 0, 0)
    baseQuery = baseQuery.where('timestamp', '>=', start)
  }
  if (query.end) {
    const end = new Date(query.end as string)
    end.setUTCHours(23, 59, 59, 999)
    baseQuery = baseQuery.where('timestamp', '<=', end)
  }
  if (status) {
    baseQuery = baseQuery.where('status', '=', status)
  }

  const result = await paginate(db, baseQuery, { page, limit })

  return result
})
