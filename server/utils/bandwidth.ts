import type { BandwidthResult } from '#shared/types/bandwidth'
import type { InterfaceInfo } from '#shared/types/interface'
import snmp from 'net-snmp'

const config = useRuntimeConfig()
const host = config.SNMP_HOST
const community = config.SNMP_COMMUNITY
const session = snmp.createSession(host, community)

// Base OIDs for interface counters
const IF_IN_OCTETS_BASE = '1.3.6.1.2.1.2.2.1.10'
const IF_OUT_OCTETS_BASE = '1.3.6.1.2.1.2.2.1.16'
const IF_DESCR_BASE = '1.3.6.1.2.1.2.2.1.2'
const IF_SPEED_BASE = '1.3.6.1.2.1.2.2.1.5'
const IF_PHYS_ADDRESS_BASE = '1.3.6.1.2.1.2.2.1.6'
const IF_OPER_STATUS_BASE = '1.3.6.1.2.1.2.2.1.8'
const IP_AD_ENT_ADDR = '1.3.6.1.2.1.4.20.1.1'
const IP_AD_ENT_IF_INDEX = '1.3.6.1.2.1.4.20.1.2'

// Cache for resolved interface indices to avoid redundant SNMP queries
const interfaceIndexCache = new Map<string, number | null>()
const interfaceInfoCache: InterfaceInfo | null = null
let cachedInterfaceInfo: InterfaceInfo | null = null
let currentInterfaceIndex: number | null = null

/**
 * Finds the first available interface with non-zero traffic
 * @returns The interface index or null if not found
 */
async function findFirstActiveInterface(): Promise<number | null> {
  return new Promise((resolve) => {
    const ifDescrOid = '1.3.6.1.2.1.2.2.1.2' // ifDescr table
    let firstIndex: number | null = null

    session.walk(
      ifDescrOid,
      (varbinds: snmp.Varbind[]) => {
        // Feed callback - called for each batch of results
        for (const varbind of varbinds) {
          const oidStr = String(varbind.oid)
          const matches = oidStr.match(/\.(\d+)$/)
          if (matches && matches[1]) {
            const index = Number.parseInt(matches[1], 10)
            if (firstIndex === null) {
              firstIndex = index
              // eslint-disable-next-line no-console
              console.log(`Auto-detected first interface: index ${index} (description: ${varbind.value})`)
              return resolve(index)
            }
          }
        }
      },
      (error: Error | null) => {
        if (error) {
          console.error('Error walking SNMP interface descriptions:', error)
          return resolve(null)
        }
        resolve(firstIndex)
      },
    )
  })
}

/**
 * Resolves an interface name to its interface index via SNMP
 * Uses caching to avoid redundant queries
 * @param interfaceName The interface name (e.g., 'wan', 'lan', 'em0', 'igb0')
 * @returns The interface index or null if not found
 */
async function resolveInterfaceIndex(interfaceName: string): Promise<number | null> {
  // Check cache first
  if (interfaceIndexCache.has(interfaceName)) {
    return interfaceIndexCache.get(interfaceName)!
  }

  return new Promise((resolve) => {
    const ifDescrOid = '1.3.6.1.2.1.2.2.1.2' // ifDescr table
    const searchName = interfaceName.toLowerCase()

    session.walk(
      ifDescrOid,
      (varbinds: snmp.Varbind[]) => {
        // Feed callback - called for each batch of results
        for (const varbind of varbinds) {
          const description = String(varbind.value).toLowerCase()
          const oidStr = String(varbind.oid)
          // Extract interface index from OID (last number in the OID)
          const matches = oidStr.match(/\.(\d+)$/)
          // Use exact match or word boundary to avoid false matches (e.g., 'wan' matching 'wlan')
          if (matches && matches[1] && (description === searchName || description.match(new RegExp(`\\b${searchName}\\b`)))) {
            const index = Number.parseInt(matches[1], 10)
            // eslint-disable-next-line no-console
            console.log(`Resolved interface '${interfaceName}' to index ${index} (description: ${varbind.value})`)
            interfaceIndexCache.set(interfaceName, index)
            return resolve(index)
          }
        }
      },
      (error: Error | null) => {
        // Done callback - called when walk completes
        if (error) {
          console.error('Error walking SNMP interface descriptions:', error)
          interfaceIndexCache.set(interfaceName, null)
          return resolve(null)
        }
        console.error(`Interface '${interfaceName}' not found in SNMP interface table`)
        interfaceIndexCache.set(interfaceName, null)
        resolve(null)
      },
    )
  })
}

/**
 * Gets detailed information about an interface via SNMP
 */
async function getInterfaceInfo(interfaceIndex: number): Promise<InterfaceInfo> {
  return new Promise((resolve, reject) => {
    const oids = [
      `${IF_DESCR_BASE}.${interfaceIndex}`,
      `${IF_SPEED_BASE}.${interfaceIndex}`,
      `${IF_PHYS_ADDRESS_BASE}.${interfaceIndex}`,
      `${IF_OPER_STATUS_BASE}.${interfaceIndex}`,
    ]

    session.get(oids, async (error, varbinds) => {
      if (error) {
        console.error('Error getting interface info:', error)
        return reject(error)
      }

      const interfaceName = varbinds[0] ? String(varbinds[0].value) : 'unknown'
      const interfaceSpeed = varbinds[1] ? Number(varbinds[1].value) : null
      const interfaceMAC = varbinds[2] ? Buffer.from(varbinds[2].value as any).toString('hex').match(/.{2}/g)?.join(':') || null : null
      const statusCode = varbinds[3] ? Number(varbinds[3].value) : 2
      const interfaceStatus = statusCode === 1 ? 'up' : 'down'

      // Get IP address for this interface
      let interfaceIP: string | null = null
      try {
        interfaceIP = await getInterfaceIP(interfaceIndex)
      }
      catch (e) {
        console.warn('Failed to get interface IP:', e)
      }

      resolve({
        interfaceName,
        interfaceIndex,
        interfaceIP,
        interfaceMAC,
        interfaceSpeed,
        interfaceStatus,
        timestamp: new Date().toISOString(),
      })
    })
  })
}

/**
 * Gets the IP address for a given interface index
 */
async function getInterfaceIP(interfaceIndex: number): Promise<string | null> {
  return new Promise((resolve) => {
    const ipToIfIndex = new Map<string, number>()

    session.walk(
      IP_AD_ENT_IF_INDEX,
      (varbinds: snmp.Varbind[]) => {
        for (const varbind of varbinds) {
          const oidStr = String(varbind.oid)
          const ipMatch = oidStr.match(/1\.3\.6\.1\.2\.1\.4\.20\.1\.2\.(\d+\.\d+\.\d+\.\d+)$/)
          if (ipMatch && ipMatch[1]) {
            const ip = ipMatch[1]
            const ifIndex = Number(varbind.value)
            ipToIfIndex.set(ip, ifIndex)
            if (ifIndex === interfaceIndex) {
              return resolve(ip)
            }
          }
        }
      },
      (error: Error | null) => {
        if (error) {
          console.error('Error walking IP addresses:', error)
        }
        // Find the IP for our interface
        for (const [ip, ifIndex] of ipToIfIndex.entries()) {
          if (ifIndex === interfaceIndex) {
            return resolve(ip)
          }
        }
        resolve(null)
      },
    )
  })
}

/**
 * Gets the OID for a given interface name
 */
async function getOidFromInterface(interfaceName: string | undefined, oidType: 'in' | 'out'): Promise<string> {
  let interfaceIndex: number | null = null

  if (interfaceName) {
    // Resolve the provided interface name
    interfaceIndex = await resolveInterfaceIndex(interfaceName)
    if (interfaceIndex === null) {
      throw new Error(`Failed to resolve interface name '${interfaceName}' to an index`)
    }
  }
  else {
    // No interface specified, auto-detect first available interface
    interfaceIndex = await findFirstActiveInterface()
    if (interfaceIndex === null) {
      throw new Error('No interface specified and auto-detection failed')
    }
  }

  // Build the appropriate OID based on the type
  const baseOid = oidType === 'in' ? IF_IN_OCTETS_BASE : IF_OUT_OCTETS_BASE
  return `${baseOid}.${interfaceIndex}`
}

let inOid: string
let outOid: string

// Initialize OIDs (will be resolved on first call if needed)
let oidsInitialized = false

async function initializeOids(): Promise<void> {
  if (oidsInitialized)
    return

  const interfaceName = config.SNMP_INTERFACE

  inOid = await getOidFromInterface(interfaceName, 'in')
  outOid = await getOidFromInterface(interfaceName, 'out')

  // Extract interface index from OID
  const indexMatch = inOid.match(/\.(\d+)$/)
  if (indexMatch && indexMatch[1]) {
    currentInterfaceIndex = Number.parseInt(indexMatch[1], 10)
    
    // Get and cache interface info
    try {
      cachedInterfaceInfo = await getInterfaceInfo(currentInterfaceIndex)
      // eslint-disable-next-line no-console
      console.log('Interface info:', cachedInterfaceInfo)
      
      // Save to database
      await saveInterfaceInfo(cachedInterfaceInfo)
    }
    catch (e) {
      console.error('Failed to get interface info:', e)
    }
  }

  oidsInitialized = true
  // eslint-disable-next-line no-console
  console.log(`Initialized SNMP OIDs - IN: ${inOid}, OUT: ${outOid}`)
}

/**
 * Saves interface info to database
 */
async function saveInterfaceInfo(info: InterfaceInfo): Promise<void> {
  try {
    const { db } = await import('../db')
    await db
      .insertInto('interface_info')
      .values({
        interfaceName: info.interfaceName,
        interfaceIndex: info.interfaceIndex,
        interfaceIP: info.interfaceIP,
        interfaceMAC: info.interfaceMAC,
        interfaceSpeed: info.interfaceSpeed,
        interfaceStatus: info.interfaceStatus,
        timestamp: new Date().toISOString(),
      })
      .execute()
  }
  catch (e) {
    console.error('Failed to save interface info to database:', e)
  }
}

/**
 * Gets the cached interface info
 */
export function getInterfaceInfoCached(): InterfaceInfo | null {
  return cachedInterfaceInfo
}

let prevIn = 0
let prevOut = 0
let firstRun = true

async function getData(): Promise<{ inBytes: number, outBytes: number }> {
  return new Promise<{ inBytes: number, outBytes: number }>((resolve, reject) => {
    session.get([inOid, outOid], (error, varbinds) => {
      if (error)
        return reject(error)
      if (!varbinds || varbinds.length < 2)
        return reject(new Error('No varbinds'))
      const inBytes = Number(varbinds[0]?.value || 0)
      const outBytes = Number(varbinds[1]?.value || 0)
      if (inBytes < 0 || outBytes < 0)
        return reject(new Error('Invalid varbinds'))
      resolve({
        inBytes,
        outBytes,
      })
    })
  })
}

export async function getBandwidth(): Promise<BandwidthResult | null> {
  try {
    // Initialize OIDs on first call
    await initializeOids()

    const res = await getData()
    if (firstRun) {
      prevIn = res.inBytes
      prevOut = res.outBytes
      firstRun = false
      return null
    }
    const diffIn = res.inBytes - prevIn
    const diffOut = res.outBytes - prevOut
    const inMbps = diffIn / 1048576
    const outMbps = diffOut / 1048576
    prevIn = res.inBytes
    prevOut = res.outBytes
    if (inMbps < 0 || outMbps < 0)
      return null
    return {
      inMbps,
      outMbps,
      host,
      timestamp: new Date().toISOString(),
      interfaceInfo: cachedInterfaceInfo || undefined,
    }
  }
  catch {
    return null
  }
}
