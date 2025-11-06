import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  let baseQuery = db.selectFrom('speedtest_results')
    .selectAll()
    .orderBy('timestamp', 'desc')

  baseQuery = applyDateRangeFilter(baseQuery, {
    start: query.start && query.start !== 'null' ? query.start as string : undefined,
    end: query.end && query.end !== 'null' ? query.end as string : undefined,
  })

  const result = await baseQuery.execute()
  exportToCsv(event, result, {
    filename: 'speedtest-results.csv',
    headers: ['isp', 'public_ip', 'download', 'upload', 'latency', 'timestamp', 'url'],
    formatRow: row => [
      row.isp,
      row.ip,
      row.download.toString(),
      row.upload.toString(),
      row.latency.toFixed(2),
      new Date(row.timestamp).toISOString(),
      row.url,
    ],
  })

  return result
})
