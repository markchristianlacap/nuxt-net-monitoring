import type { Kysely, SelectQueryBuilder } from 'kysely'

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function paginate<T, DB>(
  db: Kysely<DB>,
  query: SelectQueryBuilder<DB, any, T>,
  { page = 1, limit = 10 }: PaginationParams,
): Promise<PaginatedResult<T>> {
  const offset = (page - 1) * limit
  const { count } = await query
    .clearSelect()
    .clearOrderBy()
    .select(db.fn.countAll().as('count'))
    .executeTakeFirst() as { count: number }
  const data = await query.limit(limit).offset(offset).execute()
  const total = Number(count)
  const totalPages = Math.ceil(total / limit)

  return { data, total, page, limit, totalPages }
}
