import type { BandwidthResult } from '#shared/types/bandwidth'
import snmp from 'net-snmp'

const config = useRuntimeConfig()
const host = config.SNMP_HOST
const community = config.SNMP_COMMUNITY
const session = snmp.createSession(host, community)

// Base OIDs for interface counters
const IF_IN_OCTETS_BASE = '1.3.6.1.2.1.2.2.1.10'
const IF_OUT_OCTETS_BASE = '1.3.6.1.2.1.2.2.1.16'

// Cache for resolved interface indices to avoid redundant SNMP queries
const interfaceIndexCache = new Map<string, number | null>()

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

  oidsInitialized = true
  // eslint-disable-next-line no-console
  console.log(`Initialized SNMP OIDs - IN: ${inOid}, OUT: ${outOid}`)
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
    }
  }
  catch {
    return null
  }
}
