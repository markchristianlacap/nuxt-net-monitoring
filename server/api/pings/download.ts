import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = query.status as 'online' | 'offline' | null
  let baseQuery = db.selectFrom('pings')
    .selectAll()
    .orderBy('timestamp', 'desc')
  if (query.start && query.start !== 'null') {
    const start = new Date(query.start as string)
    start.setUTCHours(0, 0, 0, 0)
    baseQuery = baseQuery.where('timestamp', '>=', start)
  }
  if (query.end && query.end !== 'null') {
    const end = new Date(query.end as string)
    end.setUTCHours(23, 59, 59, 999)
    baseQuery = baseQuery.where('timestamp', '<=', end)
  }
  if (status) {
    baseQuery = baseQuery.where('status', '=', status)
  }

  const result = await baseQuery.execute()

  setHeader(event, 'Content-Type', 'text/csv')
  setHeader(
    event,
    'Content-Disposition',
    'attachment; filename="pings.csv"',
  )

  event.node.res.write('host,status,latency,timestamp\n')
  result.forEach((row) => {
    event.node.res.write(`${row.host},${row.status},${row.latency},${row.timestamp}\n`)
  })
  event.node.res.end()

  return result
})
