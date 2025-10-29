import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  let baseQuery = db.selectFrom('bandwidths')
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

  const result = await baseQuery.execute()

  setHeader(event, 'Content-Type', 'text/csv')
  setHeader(
    event,
    'Content-Disposition',
    'attachment; filename="bandwidths.csv"',
  )

  event.node.res.write('host,inMbps,outMbps,timestamp\n')
  result.forEach((row) => {
    event.node.res.write(
      `${row.host},${row.inMbps},${row.outMbps},${row.timestamp}\n`,
    )
  })
  event.node.res.end()

  return result
})
