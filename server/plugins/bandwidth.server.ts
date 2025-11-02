import type { BandwidthResult } from '~~/shared/types/bandwidth'
import { db } from '../db'

export default defineNitroPlugin(() => {
  const recordsPerInterface = new Map<string, BandwidthResult[]>()
  const host = useRuntimeConfig().SNMP_HOST
  
  runEverySecond(async () => {
    const bandwidths = await getAllBandwidth()
    for (const bandwidth of bandwidths) {
      events.emit('bandwidth:update', bandwidth)
      if (!bandwidth)
        continue
      
      const interfaceName = bandwidth.interfaceName || 'default'
      if (!recordsPerInterface.has(interfaceName)) {
        recordsPerInterface.set(interfaceName, [])
      }
      recordsPerInterface.get(interfaceName)!.push(bandwidth)
    }
  })
  
  async function saveAverage(interfaceName: string) {
    const records = recordsPerInterface.get(interfaceName) || []
    if (records.length === 0)
      return
      
    const avgIn = records.reduce((a, b) => a + b.inMbps, 0) / records.length
    const avgOut = records.reduce((a, b) => a + b.outMbps, 0) / records.length
    await db.insertInto('bandwidths').values({
      inMbps: avgIn,
      outMbps: avgOut,
      timestamp: new Date().toISOString(),
      host: `${host}_${interfaceName}`,
    }).execute()

    recordsPerInterface.set(interfaceName, [])
  }

  // Save averages every minute for all interfaces
  setInterval(async () => {
    for (const interfaceName of recordsPerInterface.keys()) {
      await saveAverage(interfaceName)
    }
  }, 60_000)
})
