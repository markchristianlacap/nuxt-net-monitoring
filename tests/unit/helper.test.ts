import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runEveryHour, runEveryMinute, runEverySecond } from '../../server/utils/helper'

describe('helper utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('runEverySecond', () => {
    it('should schedule task to run at the next second boundary', async () => {
      const task = vi.fn().mockResolvedValue(undefined)
      const startTime = new Date('2024-01-01T12:00:00.500Z')
      vi.setSystemTime(startTime)

      runEverySecond(task)

      // Task should not run immediately
      expect(task).not.toHaveBeenCalled()

      // Fast-forward to just before next second
      await vi.advanceTimersByTimeAsync(499)
      expect(task).not.toHaveBeenCalled()

      // Fast-forward to next second
      await vi.advanceTimersByTimeAsync(1)
      expect(task).toHaveBeenCalledTimes(1)
    })

    it('should continue scheduling after task completes', async () => {
      const task = vi.fn().mockResolvedValue(undefined)
      const startTime = new Date('2024-01-01T12:00:00.500Z')
      vi.setSystemTime(startTime)

      runEverySecond(task)

      // First execution
      await vi.advanceTimersByTimeAsync(500)
      expect(task).toHaveBeenCalledTimes(1)

      // Second execution
      await vi.advanceTimersByTimeAsync(1000)
      expect(task).toHaveBeenCalledTimes(2)
    })

    it('should handle task errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const task = vi.fn().mockRejectedValue(new Error('Task failed'))
      const startTime = new Date('2024-01-01T12:00:00.500Z')
      vi.setSystemTime(startTime)

      runEverySecond(task)

      // First execution should error
      await vi.advanceTimersByTimeAsync(500)
      expect(task).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in scheduled task:', expect.any(Error))

      // Should continue scheduling after error
      task.mockResolvedValue(undefined)
      await vi.advanceTimersByTimeAsync(1000)
      expect(task).toHaveBeenCalledTimes(2)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('runEveryHour', () => {
    it('should schedule task to run at the top of the next hour', async () => {
      const task = vi.fn().mockResolvedValue(undefined)
      const startTime = new Date('2024-01-01T12:30:45.500Z')
      vi.setSystemTime(startTime)

      runEveryHour(task)

      // Task should not run immediately
      expect(task).not.toHaveBeenCalled()

      // Fast-forward to just before next hour
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000 + 14 * 1000 + 499)
      expect(task).not.toHaveBeenCalled()

      // Fast-forward to next hour
      await vi.advanceTimersByTimeAsync(1)
      expect(task).toHaveBeenCalledTimes(1)
    })

    it('should continue scheduling every hour', async () => {
      const task = vi.fn().mockResolvedValue(undefined)
      const startTime = new Date('2024-01-01T12:30:00.000Z')
      vi.setSystemTime(startTime)

      runEveryHour(task)

      // First execution at 13:00
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
      expect(task).toHaveBeenCalledTimes(1)

      // Second execution at 14:00
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(task).toHaveBeenCalledTimes(2)
    })
  })

  describe('runEveryMinute', () => {
    it('should schedule task to run at the top of the next minute', async () => {
      const task = vi.fn().mockResolvedValue(undefined)
      const startTime = new Date('2024-01-01T12:00:30.500Z')
      vi.setSystemTime(startTime)

      runEveryMinute(task)

      // Task should not run immediately
      expect(task).not.toHaveBeenCalled()

      // Fast-forward to just before next minute
      await vi.advanceTimersByTimeAsync(29 * 1000 + 499)
      expect(task).not.toHaveBeenCalled()

      // Fast-forward to next minute
      await vi.advanceTimersByTimeAsync(1)
      expect(task).toHaveBeenCalledTimes(1)
    })

    it('should continue scheduling every minute', async () => {
      const task = vi.fn().mockResolvedValue(undefined)
      const startTime = new Date('2024-01-01T12:00:30.000Z')
      vi.setSystemTime(startTime)

      runEveryMinute(task)

      // First execution at 12:01
      await vi.advanceTimersByTimeAsync(30 * 1000)
      expect(task).toHaveBeenCalledTimes(1)

      // Second execution at 12:02
      await vi.advanceTimersByTimeAsync(60 * 1000)
      expect(task).toHaveBeenCalledTimes(2)

      // Third execution at 12:03
      await vi.advanceTimersByTimeAsync(60 * 1000)
      expect(task).toHaveBeenCalledTimes(3)
    })
  })
})
