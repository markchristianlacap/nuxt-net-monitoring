export interface SpeedtestServer {
  id: number
  host: string
  port: number
  name: string
  location: string
  country: string
}

export interface SpeedtestResult {
  type: string
  timestamp: string
  ping: Ping
  download: Download
  upload: Upload
  isp: string
  interface: Interface
  server: Server
  result: Result
}

interface Ping {
  jitter: number
  latency: number
  low: number
  high: number
}
interface Download {
  bandwidth: number
  bytes: number
  elapsed: number
  latency: Latency
}

interface Latency {
  iqm: number
  low: number
  high: number
  jitter: number
}

interface Upload {
  bandwidth: number
  bytes: number
  elapsed: number
  latency: Latency
}

interface Interface {
  internalIp: string
  name: string
  macAddr: string
  isVpn: boolean
  externalIp: string
}

interface Server {
  id: number
  host: string
  port: number
  name: string
  location: string
  country: string
  ip: string
}

interface Result {
  id: string
  url: string
  persisted: boolean
}
