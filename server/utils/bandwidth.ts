import type { BandwidthResult } from '#shared/types/bandwidth'
import snmp from 'net-snmp'

const config = useRuntimeConfig()
const host = config.SNMP_HOST
const community = config.SNMP_COMMUNITY
const session = snmp.createSession(host, community)

/**
 * Resolves an interface name to its interface index via SNMP
 * @param interfaceName The interface name (e.g., 'wan', 'lan', 'em0', 'igb0')
 * @returns The interface index or null if not found
 */
async function resolveInterfaceIndex(interfaceName: string): Promise<number | null> {
  return new Promise((resolve) => {
    const ifDescrOid = '1.3.6.1.2.1.2.2.1.2' // ifDescr table

    session.walk(
      ifDescrOid,
      (varbinds: snmp.Varbind[]) => {
        // Feed callback - called for each batch of results
        for (const varbind of varbinds) {
          const description = String(varbind.value).toLowerCase()
          const oidStr = String(varbind.oid)
          // Extract interface index from OID (last number in the OID)
          const matches = oidStr.match(/\.(\d+)$/)
          if (matches && matches[1] && description.includes(interfaceName.toLowerCase())) {
            const index = Number.parseInt(matches[1], 10)
            // eslint-disable-next-line no-console
            console.log(`Resolved interface '${interfaceName}' to index ${index} (description: ${varbind.value})`)
            return resolve(index)
          }
        }
      },
      (error: Error | null) => {
        // Done callback - called when walk completes
        if (error) {
          console.error('Error walking SNMP interface descriptions:', error)
          return resolve(null)
        }
        console.error(`Interface '${interfaceName}' not found in SNMP interface table`)
        resolve(null)
      },
    )
  })
}

/**
 * Gets the OID for a given configuration value
 * If the value looks like a complete OID, returns it as-is
 * Otherwise, treats it as an interface name or index and resolves it
 */
async function getOidFromConfig(configValue: string, oidType: 'in' | 'out'): Promise<string> {
  // Check if the config value looks like a complete OID (contains dots and starts with 1)
  if (/^1\.[\d.]+$/.test(configValue)) {
    return configValue
  }

  // Check if it's a simple numeric index
  if (/^\d+$/.test(configValue)) {
    const baseOid = oidType === 'in' ? '1.3.6.1.2.1.2.2.1.10' : '1.3.6.1.2.1.2.2.1.16'
    return `${baseOid}.${configValue}`
  }

  // Otherwise, treat it as an interface name and resolve it
  const interfaceIndex = await resolveInterfaceIndex(configValue)
  if (interfaceIndex === null) {
    throw new Error(`Failed to resolve interface name '${configValue}' to an index`)
  }

  // Build the appropriate OID based on the type
  const baseOid = oidType === 'in' ? '1.3.6.1.2.1.2.2.1.10' : '1.3.6.1.2.1.2.2.1.16'
  return `${baseOid}.${interfaceIndex}`
}

let inOid: string
let outOid: string

// Initialize OIDs (will be resolved on first call if needed)
let oidsInitialized = false

async function initializeOids(): Promise<void> {
  if (oidsInitialized)
    return

  // Priority: SNMP_IN_OID/SNMP_OUT_OID > SNMP_INTERFACE > default to interface index 5
  const inConfig = config.SNMP_IN_OID || config.SNMP_INTERFACE || '5'
  const outConfig = config.SNMP_OUT_OID || config.SNMP_INTERFACE || '5'

  inOid = await getOidFromConfig(inConfig, 'in')
  outOid = await getOidFromConfig(outConfig, 'out')

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
