import { describe, expect, it } from 'vitest'
import { applyDateRangeFilter } from '../../server/utils/query-filters'

// Mock Kysely query builder for testing
class MockQueryBuilder {
  private conditions: Array<{ column: string, operator: string, value: any }> = []

  where(column: string, operator: string, value: any) {
    this.conditions.push({ column, operator, value })
    return this
  }

  getConditions() {
    return this.conditions
  }
}

describe('query-filters', () => {
  describe('applyDateRangeFilter', () => {
    it('should apply start date filter with time set to midnight UTC', () => {
      const query = new MockQueryBuilder() as any
      const result = applyDateRangeFilter(query, { start: '2024-01-15' })

      const conditions = result.getConditions()
      expect(conditions).toHaveLength(1)
      expect(conditions[0].column).toBe('timestamp')
      expect(conditions[0].operator).toBe('>=')

      const startDate = conditions[0].value as Date
      expect(startDate.toISOString()).toBe('2024-01-15T00:00:00.000Z')
    })

    it('should apply end date filter with time set to end of day UTC', () => {
      const query = new MockQueryBuilder() as any
      const result = applyDateRangeFilter(query, { end: '2024-01-15' })

      const conditions = result.getConditions()
      expect(conditions).toHaveLength(1)
      expect(conditions[0].column).toBe('timestamp')
      expect(conditions[0].operator).toBe('<=')

      const endDate = conditions[0].value as Date
      expect(endDate.toISOString()).toBe('2024-01-15T23:59:59.999Z')
    })

    it('should apply both start and end date filters', () => {
      const query = new MockQueryBuilder() as any
      const result = applyDateRangeFilter(query, {
        start: '2024-01-01',
        end: '2024-01-31',
      })

      const conditions = result.getConditions()
      expect(conditions).toHaveLength(2)

      // Start date
      expect(conditions[0].column).toBe('timestamp')
      expect(conditions[0].operator).toBe('>=')
      expect((conditions[0].value as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z')

      // End date
      expect(conditions[1].column).toBe('timestamp')
      expect(conditions[1].operator).toBe('<=')
      expect((conditions[1].value as Date).toISOString()).toBe('2024-01-31T23:59:59.999Z')
    })

    it('should not apply any filters when dates are not provided', () => {
      const query = new MockQueryBuilder() as any
      const result = applyDateRangeFilter(query, {})

      const conditions = result.getConditions()
      expect(conditions).toHaveLength(0)
    })

    it('should use custom timestamp column name', () => {
      const query = new MockQueryBuilder() as any
      const result = applyDateRangeFilter(query, { start: '2024-01-15' }, 'created_at')

      const conditions = result.getConditions()
      expect(conditions[0].column).toBe('created_at')
    })

    it('should handle invalid date strings gracefully', () => {
      const query = new MockQueryBuilder() as any
      const result = applyDateRangeFilter(query, { start: 'invalid-date' })

      const conditions = result.getConditions()
      expect(conditions).toHaveLength(1)
      // Invalid date should create a Date object but with Invalid Date value
      expect(conditions[0].value).toBeInstanceOf(Date)
    })

    it('should preserve original query when no filters applied', () => {
      const query = new MockQueryBuilder() as any
      const originalQuery = query
      const result = applyDateRangeFilter(query, {})

      expect(result).toBe(originalQuery)
    })
  })
})
