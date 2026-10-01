export interface BandwidthResult {
  host: string
  displayName: string
  interface: string
  inMbps: number
  outMbps: number
  timestamp: string | Date
}

export interface DeviceInterface {
  host: string
  displayName: string
  index: number
  name: string
  description: string
  status: 'up' | 'down' | 'testing' | 'unknown'
  speed: number
  ip: string
}
