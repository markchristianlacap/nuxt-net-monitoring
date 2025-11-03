import type { BandwidthResult } from '~~/shared/types/bandwidth'
import { db } from '../db'

export default defineNitroPlugin(async () => {
  let records: BandwidthResult[] = []
  const interfaces = await getInterfaces()
  if (!interfaces?.length) {
    console.warn('No interfaces configured in NUXT_SNMP_INTERFACES')
    return
  }

  async function saveAverage() {
    if (records.length === 0)
      return
    const avgIn = records.reduce((a, b) => a + b.inMbps, 0) / records.length
    const avgOut = records.reduce((a, b) => a + b.outMbps, 0) / records.length
    await db.insertInto('bandwidths').values({
      inMbps: avgIn,
      outMbps: avgOut,
      timestamp: new Date().toISOString(),
      interface: records[0].interface,
      host: records[0].host,
    }).execute()
    records = []
  }

  runEverySecond(async () => {
    for (const iface of interfaces) {
      const bandwidth = await getBandwidth(iface.name)
      if (!bandwidth)
        continue
      events.emit('bandwidth:update', bandwidth)
      records.push(bandwidth)
    }
  })
  runEveryMinute(saveAverage)
})
