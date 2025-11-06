import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = query.status as 'online' | 'offline' | null

  let baseQuery = db.selectFrom('pings')
    .selectAll()
    .orderBy('timestamp', 'desc')

  baseQuery = applyDateRangeFilter(baseQuery, {
    start: query.start && query.start !== 'null' ? query.start as string : undefined,
    end: query.end && query.end !== 'null' ? query.end as string : undefined,
  })

  if (status) {
    baseQuery = baseQuery.where('status', '=', status)
  }

  const result = await baseQuery.execute()

  exportToCsv(event, result, {
    filename: 'pings.csv',
    headers: ['host', 'status', 'latency', 'timestamp'],
    formatRow: row => [row.host, row.status, String(row.latency), String(row.timestamp)],
  })

  return result
})
