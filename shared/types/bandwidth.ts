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
  alias: string
  description: string
  status: 'up' | 'down' | 'testing' | 'unknown'
  speed: number
  ip: string
}

export interface DeviceStatus {
  host: string
  displayName: string
  status: 'up' | 'down' | 'unknown'
  lastSeenAt: string | null
}

export interface DeviceGatewayInfo {
  host: string
  displayName: string
  gateways: string[]
}
