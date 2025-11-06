import type { SelectQueryBuilder } from 'kysely'

export interface DateRangeQuery {
  start?: string
  end?: string
}

/**
 * Apply date range filters to a query
 * @param query - The query builder to apply filters to
 * @param dateQuery - Object containing start and end date strings
 * @param timestampColumn - Name of the timestamp column (default: 'timestamp')
 */
export function applyDateRangeFilter<DB, TB extends keyof DB & string, O>(
  query: SelectQueryBuilder<DB, TB, O>,
  dateQuery: DateRangeQuery,
  timestampColumn: string = 'timestamp',
): SelectQueryBuilder<DB, TB, O> {
  let filteredQuery = query

  if (dateQuery.start) {
    const start = new Date(dateQuery.start)
    if (!Number.isNaN(start.getTime())) {
      start.setUTCHours(0, 0, 0, 0)
      filteredQuery = filteredQuery.where(timestampColumn as any, '>=', start as any)
    }
  }

  if (dateQuery.end) {
    const end = new Date(dateQuery.end)
    if (!Number.isNaN(end.getTime())) {
      end.setUTCHours(23, 59, 59, 999)
      filteredQuery = filteredQuery.where(timestampColumn as any, '<=', end as any)
    }
  }

  return filteredQuery
}
