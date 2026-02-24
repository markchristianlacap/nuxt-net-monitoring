/**
 * Shared styling constants for data tables
 */
export const TABLE_CLASSES = 'rounded-2xl overflow-hidden border border-slate-700/40 bg-slate-900/50'

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
  download: 'text-blue-400',
  upload: 'text-green-400',
  latency: 'text-rose-400',
  in: 'text-blue-400',
  out: 'text-green-400',
  default: 'text-slate-200',
} as const
