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
  users: UserTable
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
  interface: string
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

export interface UserTable {
  id: Generated<number>
  username: string
  password: string
  email: string | null
  name: string | null
  lastLoginAt: ColumnType<Date, string> | null
  createdAt: ColumnType<Date, string>
  updatedAt: ColumnType<Date, string>
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

export type User = Selectable<UserTable>
export type NewUser = Insertable<UserTable>
export type UpdateUser = Updateable<UserTable>
