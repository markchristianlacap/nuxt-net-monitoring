import { Buffer } from 'node:buffer'
import snmp from 'net-snmp'

interface DeviceContext {
  config: SnmpDeviceConfig
  displayName: string
  session: snmp.Session
  sessionClosed: boolean
  interfaces: DeviceInterface[] | null
  cacheTimestamp: number
  status: DeviceStatus['status']
  lastSeenAt: string | null
  retryAt: number
  gateways: string[] | null
  gatewayCacheTimestamp: number
  bandwidthState: Map<number, { inBytes: bigint, outBytes: bigint, time: number }>
}

const OIDS = {
  ifIndex: '1.3.6.1.2.1.2.2.1.1',
  ifName: '1.3.6.1.2.1.31.1.1.1.1',
  ifAlias: '1.3.6.1.2.1.31.1.1.1.18',
  ifDescr: '1.3.6.1.2.1.2.2.1.2',
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
  ifSpeed: '1.3.6.1.2.1.31.1.1.1.15',
  ifHCIn: '1.3.6.1.2.1.31.1.1.1.6',
  ifHCOut: '1.3.6.1.2.1.31.1.1.1.10',
  ipAdEntIfIndex: '1.3.6.1.2.1.4.20.1.2',
  hrSWRunName: '1.3.6.1.2.1.25.4.2.1.2',
  hrSWRunParameters: '1.3.6.1.2.1.25.4.2.1.5',
}

const contexts = new Map<string, DeviceContext>()

function createSession(context: DeviceContext): snmp.Session {
  const session = snmp.createSession(context.config.host, context.config.community, {
    version: snmp.Version2c,
    timeout: 1_000,
    retries: 1,
  })
  context.sessionClosed = false
  session.on('close', () => {
    context.sessionClosed = true
    invalidateDeviceState(context)
  })
  session.on('error', (error) => {
    console.error(`SNMP session error (${context.config.host}):`, error)
  })
  return session
}

function invalidateDeviceState(context: DeviceContext) {
  context.interfaces = null
  context.cacheTimestamp = 0
  context.gateways = null
  context.gatewayCacheTimestamp = 0
  context.bandwidthState.clear()
}

function markDeviceUp(context: DeviceContext) {
  context.status = 'up'
  context.lastSeenAt = new Date().toISOString()
  context.retryAt = 0
}

function markDeviceDown(context: DeviceContext) {
  context.status = 'down'
  context.retryAt = Date.now() + 5_000
  context.bandwidthState.clear()
}

function isRequestTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'RequestTimedOutError'
}

function toDeviceStatus(context: DeviceContext): DeviceStatus {
  return {
    host: context.config.host,
    displayName: context.displayName,
    status: context.status,
    lastSeenAt: context.lastSeenAt,
  }
}

function getDeviceContext(config: SnmpDeviceConfig): DeviceContext {
  const key = config.host.trim().toLowerCase()
  let context = contexts.get(key)
  if (!context) {
    context = {
      config,
      displayName: config.displayName?.trim() || config.host,
      session: undefined as unknown as snmp.Session,
      sessionClosed: false,
      interfaces: null,
      cacheTimestamp: 0,
      status: 'unknown',
      lastSeenAt: null,
      retryAt: 0,
      gateways: null,
      gatewayCacheTimestamp: 0,
      bandwidthState: new Map(),
    }
    context.session = createSession(context)
    contexts.set(key, context)
  }
  else {
    context.config = config
    context.displayName = config.displayName?.trim() || config.host
    if (context.sessionClosed)
      context.session = createSession(context)
  }
  return context
}

async function getContexts(): Promise<DeviceContext[]> {
  const settings = await getAppSettings()
  const devices = settings.features.bandwidth
    ? settings.snmp.devices
    : []
  const activeHosts = new Set(devices.map(device => device.host.trim().toLowerCase()))

  for (const [host, context] of contexts) {
    if (activeHosts.has(host))
      continue
    context.session.close()
    contexts.delete(host)
  }

  return devices.map(getDeviceContext)
}

export function resetDeviceContexts() {
  for (const context of contexts.values())
    context.session.close()
  contexts.clear()
}

function walk(context: DeviceContext, oid: string, handler: (index: number, value: any) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    context.session.subtree(oid, (varbinds) => {
      for (const vb of Array.isArray(varbinds)
        ? varbinds
        : [varbinds]) {
        if (!vb.oid)
          continue
        const index = Number(vb.oid.split('.').pop())
        if (Number.isFinite(index))
          handler(index, vb.value)
      }
    }, err => (err
      ? reject(err)
      : resolve()))
  })
}

async function getIpAddresses(context: DeviceContext): Promise<Record<number, string>> {
  const ipMap: Record<number, string> = {}
  return new Promise((resolve, reject) => {
    context.session.subtree(OIDS.ipAdEntIfIndex, (varbinds) => {
      for (const vb of Array.isArray(varbinds)
        ? varbinds
        : [varbinds]) {
        if (!vb.oid)
          continue
        const ip = vb.oid.split('.').slice(-4).join('.')
        const ifIndex = Number(vb.value)
        if (ip && ifIndex)
          ipMap[ifIndex] = ip
      }
    }, err => (err
      ? reject(err)
      : resolve(ipMap)))
  })
}

async function getDeviceInterfaces(context: DeviceContext): Promise<DeviceInterface[]> {
  const now = Date.now()
  if (context.status === 'down' && now < context.retryAt)
    return context.interfaces ?? []
  if (context.interfaces && context.status !== 'down' && now - context.cacheTimestamp < 30_000)
    return context.interfaces

  const data: Record<number, Partial<DeviceInterface>> = {}
  await Promise.all([
    walk(context, OIDS.ifIndex, (index, value) => {
      data[index] ??= {}
      data[index].index = Number(value)
    }),
    walk(context, OIDS.ifName, (index, value) => {
      data[index] ??= {}
      data[index].name = value.toString()
    }),
    walk(context, OIDS.ifAlias, (index, value) => {
      data[index] ??= {}
      data[index].alias = value.toString()
    }),
    walk(context, OIDS.ifDescr, (index, value) => {
      data[index] ??= {}
      data[index].description = value.toString()
    }),
    walk(context, OIDS.ifOperStatus, (index, value) => {
      data[index] ??= {}
      const statusMap: Record<number, DeviceInterface['status']> = { 1: 'up', 2: 'down', 3: 'testing' }
      data[index].status = statusMap[value as number] || 'unknown'
    }),
    walk(context, OIDS.ifSpeed, (index, value) => {
      data[index] ??= {}
      data[index].speed = Number(value)
    }),
  ])

  const ipMap = await getIpAddresses(context)
  const filter = context.config.interfaces?.map(name => name.trim()).filter(Boolean) ?? []
  context.interfaces = Object.values(data)
    .filter((iface): iface is Partial<DeviceInterface> & { index: number, name: string } => !!iface.name && iface.index !== undefined)
    .map(iface => ({
      host: context.config.host,
      displayName: context.displayName,
      index: iface.index,
      name: iface.name,
      alias: iface.alias ?? '',
      description: iface.description ?? '',
      status: iface.status ?? 'unknown',
      speed: iface.speed ?? 0,
      ip: ipMap[iface.index] ?? '',
    }))
    .filter(iface => filter.length === 0 || filter.includes(iface.name))
  context.cacheTimestamp = now
  markDeviceUp(context)
  return context.interfaces
}

export async function getInterfaces(host?: string): Promise<DeviceInterface[]> {
  const contexts = await getContexts()
  const normalizedHost = host?.trim().toLowerCase()
  const selectedContexts = normalizedHost
    ? contexts.filter(context => context.config.host.trim().toLowerCase() === normalizedHost)
    : contexts
  const results = await Promise.all(selectedContexts.map(async (context) => {
    try {
      return await getDeviceInterfaces(context)
    }
    catch (error) {
      if (isRequestTimeout(error))
        markDeviceDown(context)
      console.error(`getInterfaces(${context.config.host}) error:`, error)
      return context.interfaces ?? []
    }
  }))
  return results.flat()
}

export async function getDeviceInterfacesForHost(host: string): Promise<DeviceInterface[]> {
  const normalizedHost = host.trim().toLowerCase()
  let context = contexts.get(normalizedHost)
  if (!context) {
    const allContexts = await getContexts()
    context = allContexts.find(device => device.config.host.trim().toLowerCase() === normalizedHost)
  }
  if (!context)
    return []

  try {
    return await getDeviceInterfaces(context)
  }
  catch (error) {
    if (isRequestTimeout(error))
      markDeviceDown(context)
    console.error(`getInterfaces(${context.config.host}) error:`, error)
    return context.interfaces ?? []
  }
}

export async function getDeviceStatuses(): Promise<DeviceStatus[]> {
  const contexts = await getContexts()
  return contexts.map(toDeviceStatus)
}

export function getDeviceStatus(host: string): DeviceStatus | undefined {
  const context = contexts.get(host.trim().toLowerCase())
  return context
    ? toDeviceStatus(context)
    : undefined
}

async function getDeviceGateways(context: DeviceContext): Promise<string[]> {
  const now = Date.now()
  if (context.status === 'down' && now < context.retryAt)
    return context.gateways ?? []
  if (context.gateways && now - context.gatewayCacheTimestamp < 30_000)
    return context.gateways

  const processNames: Record<number, string> = {}
  const processParameters: Record<number, string> = {}
  await Promise.all([
    walk(context, OIDS.hrSWRunName, (index, value) => {
      processNames[index] = value.toString()
    }),
    walk(context, OIDS.hrSWRunParameters, (index, value) => {
      processParameters[index] = value.toString()
    }),
  ])

  const gateways = Object.entries(processParameters).flatMap(([index, parameters]) => {
    if (!processNames[Number(index)]?.toLowerCase().includes('dpinger'))
      return []
    const gateway = parameters.match(/(?:^|\s)-i\s+(\S+)/)?.[1]
    if (gateway)
      return [gateway]
    return []
  })
  context.gateways = Array.from(new Set(gateways))
  context.gatewayCacheTimestamp = now
  markDeviceUp(context)
  return context.gateways
}

export async function getGateways(): Promise<DeviceGatewayInfo[]> {
  const contexts = await getContexts()
  return Promise.all(contexts.map(async (context) => {
    try {
      return {
        host: context.config.host,
        displayName: context.displayName,
        gateways: await getDeviceGateways(context),
      }
    }
    catch (error) {
      context.gateways = null
      context.gatewayCacheTimestamp = 0
      if (isRequestTimeout(error))
        markDeviceDown(context)
      console.error(`getGateways(${context.config.host}) error:`, error)
      return {
        host: context.config.host,
        displayName: context.displayName,
        gateways: [],
      }
    }
  }))
}

function bufferToUint64(buf: Buffer): bigint {
  if (!Buffer.isBuffer(buf))
    return BigInt(buf)
  if (buf.length < 8) {
    buf = Buffer.concat([
      Buffer.alloc(8 - buf.length),
      buf,
    ])
  }
  return buf.readBigUint64BE(0)
}

function snmpGet(context: DeviceContext, oids: string[]): Promise<{ inBytes: bigint, outBytes: bigint }> {
  return new Promise((resolve, reject) => {
    context.session.get(oids, (err, varbinds) => {
      if (err || !Array.isArray(varbinds))
        return reject(err || new Error('Invalid SNMP response'))
      const bytes = varbinds.map((vb) => {
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
      resolve({ inBytes: bytes[0] ?? 0n, outBytes: bytes[1] ?? 0n })
    })
  })
}

export async function getBandwidth(host: string, iface: string): Promise<BandwidthResult | null> {
  const normalizedHost = host.trim().toLowerCase()
  const context = contexts.get(normalizedHost)
    ?? (await getContexts()).find(device => device.config.host.trim().toLowerCase() === normalizedHost)
  if (!context)
    return null

  try {
    const deviceInterfaces = await getDeviceInterfaces(context)
    const index = deviceInterfaces.find(deviceInterface => deviceInterface.name === iface)?.index
    if (index === undefined)
      throw new Error(`Interface ${iface} not found on ${host}`)

    const { inBytes, outBytes } = await snmpGet(context, [
      `${OIDS.ifHCIn}.${index}`,
      `${OIDS.ifHCOut}.${index}`,
    ])
    markDeviceUp(context)
    const now = Date.now()
    const previous = context.bandwidthState.get(index)
    context.bandwidthState.set(index, { inBytes, outBytes, time: now })
    if (!previous)
      return null

    const timeDiff = (now - previous.time) / 1000
    const diffIn = inBytes - previous.inBytes
    const diffOut = outBytes - previous.outBytes
    const validIn = diffIn >= 0n
      ? diffIn
      : inBytes
    const validOut = diffOut >= 0n
      ? diffOut
      : outBytes

    return {
      host: context.config.host,
      displayName: context.displayName,
      interface: iface,
      inMbps: Number(validIn * 8n) / (timeDiff * 1_000_000),
      outMbps: Number(validOut * 8n) / (timeDiff * 1_000_000),
      timestamp: new Date(now).toISOString(),
    }
  }
  catch (error) {
    if (isRequestTimeout(error))
      markDeviceDown(context)
    console.error(`getBandwidth(${host}, ${iface}) error:`, error)
    return null
  }
}
