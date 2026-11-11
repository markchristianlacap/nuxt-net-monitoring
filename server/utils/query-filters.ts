import type { SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { gte, lte } from 'drizzle-orm'

export interface DateRangeQuery {
  start?: string
  end?: string
}

/**
 * Build timestamp predicates from optional date range query parameters.
 */
export function dateRangeConditions(
  timestampColumn: PgColumn,
  dateQuery: DateRangeQuery,
): SQL[] {
  const conditions: SQL[] = []

  if (dateQuery.start) {
    const start = new Date(dateQuery.start)
    if (!Number.isNaN(start.getTime())) {
      conditions.push(gte(timestampColumn, start))
    }
  }

  if (dateQuery.end) {
    const end = new Date(dateQuery.end)
    if (!Number.isNaN(end.getTime())) {
      conditions.push(lte(timestampColumn, end))
    }
  }

  return conditions
}
