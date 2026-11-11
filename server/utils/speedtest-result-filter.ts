import type { SQL } from 'drizzle-orm'
import { eq, isNull } from 'drizzle-orm'
import { speedtestResults } from '../db/schema/speedtest-results'

export const LEGACY_INTERFACE_FILTER = '__legacy__'

export function getSpeedtestInterfaceFilter(value: unknown): SQL | undefined {
  if (typeof value !== 'string' || value === '' || value === 'all')
    return undefined
  if (value === LEGACY_INTERFACE_FILTER)
    return isNull(speedtestResults.networkInterface)
  return eq(speedtestResults.networkInterface, value)
}
