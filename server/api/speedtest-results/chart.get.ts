import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  let baseQuery = db.selectFrom('speedtest_results')
    .selectAll()
    .orderBy('timestamp', 'asc')

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

  const data = await baseQuery.execute()

  return data
})
