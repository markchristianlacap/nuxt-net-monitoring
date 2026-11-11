/**
 * Shared styling constants for data tables
 */
export const TABLE_CLASSES = 'overflow-hidden rounded-2xl border border-default bg-elevated'

/**
 * Common date formatting options for timestamps
 */
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
}

/**
 * Color classes for different data types
 */
export const DATA_COLORS = {
  download: 'text-blue-700 dark:text-blue-400',
  upload: 'text-green-700 dark:text-green-400',
  latency: 'text-rose-700 dark:text-rose-400',
  in: 'text-blue-700 dark:text-blue-400',
  out: 'text-green-700 dark:text-green-400',
  default: 'text-toned',
} as const
