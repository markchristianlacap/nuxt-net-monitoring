import { Buffer } from 'node:buffer'
import snmp from 'net-snmp'

const config = useRuntimeConfig()
const HOST = config.SNMP_HOST
const COMMUNITY = config.SNMP_COMMUNITY
const INTERFACES = config.SNMP_INTERFACES?.split(',').map(i => i.trim()) || []

// SNMP OIDs used for interface data
const OIDS = {
  ifIndex: '1.3.6.1.2.1.2.2.1.1',
  ifName: '1.3.6.1.2.1.31.1.1.1.1',
  ifDescr: '1.3.6.1.2.1.2.2.1.2',
  ifOperStatus: '1.3.6.1.2.2.1.8',
  ifSpeed: '1.3.6.1.2.1.31.1.1.1.15',
  ifHCIn: '1.3.6.1.2.1.31.1.1.1.6',
  ifHCOut: '1.3.6.1.2.1.31.1.1.1.10',
  ipAdEntIfIndex: '1.3.6.1.2.1.4.20.1.2',
}

let SESSION: snmp.Session | null = null

export function getDeviceSession(): snmp.Session {
  if (!SESSION)
    SESSION = snmp.createSession(HOST, COMMUNITY)
  return SESSION
}

const CACHE_TTL = 30_000
let INTERFACES_INFO: DeviceInterface[] | null = null
let CACHE_TIMESTAMP = 0

async function walk(oid: string, handler: (index: number, value: any, oid?: string) => void): Promise<void> {
  const session = getDeviceSession()
  return new Promise((resolve, reject) => {
    session.subtree(oid, (varbinds) => {
      const vb = Array.isArray(varbinds) ? varbinds[0] : varbinds
      if (!vb?.oid)
        return
      const idx = Number(vb.oid.split('.').pop())
      if (Number.isFinite(idx))
        handler(idx, vb.value, vb.oid)
    }, err => (err ? reject(err) : resolve()))
  })
}

async function getIpAddresses(): Promise<Record<number, string>> {
  const ipMap: Record<number, string> = {}
  const session = getDeviceSession()
  return new Promise((resolve, reject) => {
    session.subtree(OIDS.ipAdEntIfIndex, (varbinds) => {
      const vb = Array.isArray(varbinds) ? varbinds[0] : varbinds
      if (!vb?.oid)
        return
      const ip = vb.oid.split('.').slice(-4).join('.')
      const ifIndex = Number(vb.value)
      if (ip && ifIndex)
        ipMap[ifIndex] = ip
    }, err => (err ? reject(err) : resolve(ipMap)))
  })
}

export async function getInterfaces(): Promise<DeviceInterface[] | null> {
  const now = Date.now()
  if (INTERFACES_INFO && now - CACHE_TIMESTAMP < CACHE_TTL)
    return INTERFACES_INFO

  const data: Record<number, Partial<DeviceInterface>> = {}
  try {
    await Promise.all([
      walk(OIDS.ifIndex, (i, v) => (data[i] = { index: Number(v) })),
      walk(OIDS.ifName, (i, v) => {
        if (!data[i])
          data[i] = {}
        data[i].name = v.toString()
      }),
      walk(OIDS.ifDescr, (i, v) => {
        if (!data[i])
          data[i] = {}
        data[i].description = v.toString()
      }),
      walk(OIDS.ifOperStatus, (i, v) => {
        if (!data[i])
          data[i] = {}
        const map: Record<number, DeviceInterface['status']> = { 1: 'up', 2: 'down', 3: 'testing' }
        data[i].status = map[v as number] || 'unknown'
      }),
      walk(OIDS.ifSpeed, (i, v) => {
        if (!data[i])
          data[i] = {}
        data[i].speed = Number(v)
      }),
    ])

    const ipMap = await getIpAddresses()
    const all = Object.values(data)
      .filter(i => i.name)
      .map(i => ({
        ...i,
        ip: ipMap[i.index!],
      })) as DeviceInterface[]

    const filtered = INTERFACES.length ? all.filter(i => INTERFACES.includes(i.name)) : all
    INTERFACES_INFO = filtered
    CACHE_TIMESTAMP = now
    return filtered
  }
  catch (e) {
    console.error('getInterfaces error:', e)
    return null
  }
}

const BANDWIDTH_STATE: Record<string, { inBytes: bigint, outBytes: bigint, time: number }> = {}

function bufferToUint64(buf: Buffer): bigint {
  if (!Buffer.isBuffer(buf))
    return BigInt(buf)
  if (buf.length < 8)
    buf = Buffer.concat([Buffer.alloc(8 - buf.length), buf])
  return buf.readBigUint64BE(0)
}

async function snmpGet(oids: string[]): Promise<{ inBytes: bigint, outBytes: bigint }> {
  const session = getDeviceSession()
  return new Promise((resolve, reject) => {
    session.get(oids, (err, vbs) => {
      if (err || !Array.isArray(vbs))
        return reject(err || new Error('Invalid SNMP response'))
      const bytes = vbs.map((vb) => {
        if (!vb?.value)
          return 0n
        if (vb.value instanceof Buffer)
          return bufferToUint64(vb.value)
        try {
          return BigInt(vb.value as string)
        }
        catch {
          return 0n
        }
      })
      const inBytes = bytes[0] ?? 0n
      const outBytes = bytes[1] ?? 0n
      resolve({ inBytes, outBytes })
    })
  })
}

export async function getBandwidth(iface: string): Promise<BandwidthResult | null> {
  try {
    const index = INTERFACES_INFO?.find(i => i.name === iface)?.index
    if (!index)
      throw new Error(`Interface ${iface} not found`)

    const { inBytes, outBytes } = await snmpGet([
      `${OIDS.ifHCIn}.${index}`,
      `${OIDS.ifHCOut}.${index}`,
    ])
    const now = Date.now()

    const prev = BANDWIDTH_STATE[iface]
    if (!prev) {
      BANDWIDTH_STATE[iface] = { inBytes, outBytes, time: now }
      return null // first read → no diff yet
    }

    const timeDiff = (now - prev.time) / 1000
    const diffIn = inBytes - prev.inBytes
    const diffOut = outBytes - prev.outBytes
    const validIn = diffIn >= 0n ? diffIn : inBytes
    const validOut = diffOut >= 0n ? diffOut : outBytes
    BANDWIDTH_STATE[iface] = { inBytes, outBytes, time: now }

    return {
      host: HOST,
      interface: iface,
      inMbps: Number(validIn * 8n) / (timeDiff * 1_000_000),
      outMbps: Number(validOut * 8n) / (timeDiff * 1_000_000),
      timestamp: new Date(now).toISOString(),
    }
  }
  catch (e) {
    console.error(`getBandwidth(${iface}) error:`, e)
    return null
  }
}
