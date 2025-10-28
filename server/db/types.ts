import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely'

export interface Database {
  pings: PingTable
  bandwidths: BandwidthTable
  speedtest_results: SpeedtestTable
}

export interface PingTable {
  id: Generated<number>
  host: string
  status: 'online' | 'offline'
  latency: number | null
  timestamp: ColumnType<Date, string>
}

export interface BandwidthTable {
  id: Generated<number>
  host: string
  inMbps: number
  outMbps: number
  timestamp: ColumnType<Date, string>
}
export interface SpeedtestTable {
  id: Generated<number>
  timestamp: ColumnType<Date, string>
  download: number
  upload: number
  latency: number
  isp: string
  ip: string
  url: string
}
export type Ping = Selectable<PingTable>
export type NewPing = Insertable<PingTable>
export type UpdatePing = Updateable<PingTable>

export type Bandwidth = Selectable<BandwidthTable>
export type NewBandwidth = Insertable<BandwidthTable>
export type UpdateBandwidth = Updateable<BandwidthTable>

export type Speedtest = Selectable<SpeedtestTable>
export type NewSpeedtest = Insertable<SpeedtestTable>
export type UpdateSpeedtest = Updateable<SpeedtestTable>
