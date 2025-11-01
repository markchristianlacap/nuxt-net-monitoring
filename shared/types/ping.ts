export interface PingResult {
  host: string
  status: 'online' | 'offline'
  latency: number
  timestamp: string | Date
}
