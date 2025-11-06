import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  let baseQuery = db.selectFrom('bandwidths')
    .selectAll()
    .orderBy('timestamp', 'desc')

  baseQuery = applyDateRangeFilter(baseQuery, {
    start: query.start && query.start !== 'null' ? query.start as string : undefined,
    end: query.end && query.end !== 'null' ? query.end as string : undefined,
  })

  const result = await baseQuery.execute()

  exportToCsv(event, result, {
    filename: 'bandwidths.csv',
    headers: ['host', 'inMbps', 'outMbps', 'timestamp'],
    formatRow: row => [row.host, String(row.inMbps), String(row.outMbps), String(row.timestamp)],
  })

  return result
})
