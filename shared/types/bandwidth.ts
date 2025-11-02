import type { InterfaceInfo } from './interface'

export interface BandwidthResult {
  inMbps: number
  outMbps: number
  host: string
  timestamp: string | Date
  interfaceInfo?: InterfaceInfo
}
