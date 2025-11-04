import { describe, expect, it, vi } from 'vitest'
import { exportToCsv } from '../../server/utils/csv-export'

describe('csv-export', () => {
  describe('exportToCsv', () => {
    it('should set correct CSV headers', () => {
      const mockRes = {
        write: vi.fn(),
        end: vi.fn(),
        setHeader: vi.fn(),
      }

      const mockEvent = {
        node: { res: mockRes },
      } as any

      const data = [{ id: 1, name: 'Test' }]
      const options = {
        filename: 'test.csv',
        headers: ['ID', 'Name'],
        formatRow: (row: any) => [row.id.toString(), row.name],
      }

      exportToCsv(mockEvent, data, options)

      // Check that setHeader was called on the res object
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv')
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="test.csv"',
      )
    })

    it('should write CSV header row', () => {
      const mockRes = {
        write: vi.fn(),
        end: vi.fn(),
        setHeader: vi.fn(),
      }

      const mockEvent = {
        node: { res: mockRes },
      } as any

      const data: any[] = []
      const options = {
        filename: 'test.csv',
        headers: ['ID', 'Name', 'Email'],
        formatRow: (_row: any) => [],
      }

      exportToCsv(mockEvent, data, options)

      expect(mockRes.write).toHaveBeenCalledWith('ID,Name,Email\n')
      expect(mockRes.end).toHaveBeenCalled()
    })

    it('should format and write data rows', () => {
      const mockRes = {
        write: vi.fn(),
        end: vi.fn(),
        setHeader: vi.fn(),
      }

      const mockEvent = {
        node: { res: mockRes },
      } as any

      const data = [
        { id: 1, name: 'Alice', email: 'alice@test.com' },
        { id: 2, name: 'Bob', email: 'bob@test.com' },
      ]

      const options = {
        filename: 'users.csv',
        headers: ['ID', 'Name', 'Email'],
        formatRow: (row: any) => [row.id.toString(), row.name, row.email],
      }

      exportToCsv(mockEvent, data, options)

      expect(mockRes.write).toHaveBeenCalledTimes(3) // header + 2 rows
      expect(mockRes.write).toHaveBeenNthCalledWith(1, 'ID,Name,Email\n')
      expect(mockRes.write).toHaveBeenNthCalledWith(2, '1,Alice,alice@test.com\n')
      expect(mockRes.write).toHaveBeenNthCalledWith(3, '2,Bob,bob@test.com\n')
      expect(mockRes.end).toHaveBeenCalled()
    })

    it('should handle empty data array', () => {
      const mockRes = {
        write: vi.fn(),
        end: vi.fn(),
        setHeader: vi.fn(),
      }

      const mockEvent = {
        node: { res: mockRes },
      } as any

      const data: any[] = []
      const options = {
        filename: 'empty.csv',
        headers: ['ID', 'Name'],
        formatRow: (row: any) => [row.id.toString(), row.name],
      }

      exportToCsv(mockEvent, data, options)

      expect(mockRes.write).toHaveBeenCalledTimes(1) // only header
      expect(mockRes.write).toHaveBeenCalledWith('ID,Name\n')
      expect(mockRes.end).toHaveBeenCalled()
    })

    it('should handle special characters in filename', () => {
      const mockRes = {
        write: vi.fn(),
        end: vi.fn(),
        setHeader: vi.fn(),
      }

      const mockEvent = {
        node: { res: mockRes },
      } as any

      const data: any[] = []
      const options = {
        filename: 'my-data (2024).csv',
        headers: ['ID'],
        formatRow: (_row: any) => [],
      }

      exportToCsv(mockEvent, data, options)

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="my-data (2024).csv"',
      )
    })

    it('should handle formatRow that returns different types', () => {
      const mockRes = {
        write: vi.fn(),
        end: vi.fn(),
        setHeader: vi.fn(),
      }

      const mockEvent = {
        node: { res: mockRes },
      } as any

      const data = [
        { id: 1, value: 123.45, active: true },
      ]

      const options = {
        filename: 'test.csv',
        headers: ['ID', 'Value', 'Active'],
        formatRow: (row: any) => [
          row.id.toString(),
          row.value.toFixed(2),
          row.active ? 'Yes' : 'No',
        ],
      }

      exportToCsv(mockEvent, data, options)

      expect(mockRes.write).toHaveBeenNthCalledWith(2, '1,123.45,Yes\n')
    })

    it('should call res.end() to complete response', () => {
      const mockRes = {
        write: vi.fn(),
        end: vi.fn(),
        setHeader: vi.fn(),
      }

      const mockEvent = {
        node: { res: mockRes },
      } as any

      const data = [{ id: 1 }]
      const options = {
        filename: 'test.csv',
        headers: ['ID'],
        formatRow: (row: any) => [row.id.toString()],
      }

      exportToCsv(mockEvent, data, options)

      expect(mockRes.end).toHaveBeenCalledTimes(1)
    })
  })
})
