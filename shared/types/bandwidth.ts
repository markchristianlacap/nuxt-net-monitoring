export interface BandwidthResult {
  host: string
  interface: string
  inMbps: number
  outMbps: number
  timestamp: string | Date
}

export interface DeviceInterface {
  index: number
  name: string
  description: string
  status: 'up' | 'down' | 'testing' | 'unknown'
  speed: number
  ip: string
}
