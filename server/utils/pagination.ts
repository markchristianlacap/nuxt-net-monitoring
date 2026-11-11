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

export async function paginate<T>(
  queries: {
    fetchData: (limit: number, offset: number) => Promise<T[]>
    fetchTotal: () => Promise<{ total: number }[]>
  },
  { page = 1, limit = 10 }: PaginationParams,
): Promise<PaginatedResult<T>> {
  const offset = (page - 1) * limit
  const [data, countResult] = await Promise.all([
    queries.fetchData(limit, offset),
    queries.fetchTotal(),
  ])
  const total = Number(countResult[0]?.total ?? 0)
  const totalPages = Math.ceil(total / limit)

  return { data, total, page, limit, totalPages }
}
