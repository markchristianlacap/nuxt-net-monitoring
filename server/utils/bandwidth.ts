import type { BandwidthResult } from '#shared/types/bandwidth'
import snmp from 'net-snmp'

const config = useRuntimeConfig()
const host = config.SNMP_HOST
const community = config.SNMP_COMMUNITY
const session = snmp.createSession(host, community)

const inOid = '1.3.6.1.2.1.2.2.1.10.5'
const outOid = '1.3.6.1.2.1.2.2.1.16.5'

let prevIn = 0
let prevOut = 0
let firstRun = true

async function getData(): Promise<{ inBytes: number, outBytes: number }> {
  return new Promise<{ inBytes: number, outBytes: number }>((resolve, reject) => {
    session.get([inOid, outOid], (error, varbinds) => {
      if (error)
        return reject(error)
      if (!varbinds)
        return reject(new Error('No varbinds'))
      const inBytes = Number(varbinds[0].value)
      const outBytes = Number(varbinds[1].value)
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
