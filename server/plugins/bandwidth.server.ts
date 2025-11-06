import { db } from '../db'

export default defineNitroPlugin(async () => {
  const results: Map<string, BandwidthResult[]> = new Map()
  const interfaces = await getInterfaces()
  if (!interfaces?.length) {
    console.warn('No interfaces configured in NUXT_SNMP_INTERFACES')
    return
  }

  async function saveAverage(iface: string) {
    const records = results.get(iface)
    if (!records)
      return
    const avgIn = records.reduce((a, b) => a + b.inMbps, 0) / records.length
    const avgOut = records.reduce((a, b) => a + b.outMbps, 0) / records.length
    await db.insertInto('bandwidths').values({
      inMbps: avgIn,
      outMbps: avgOut,
      timestamp: new Date().toISOString(),
      interface: iface,
      host: records[0].host,
    }).execute()
    results.set(iface, [])
  }

  runEverySecond(async () => {
    for (const iface of interfaces) {
      const bandwidth = await getBandwidth(iface.name)
      if (!bandwidth)
        continue
      events.emit('bandwidth:update', bandwidth)
      if (!results.has(iface.name)) {
        results.set(iface.name, [bandwidth])
      }
      else {
        results.get(iface.name)?.push(bandwidth)
      }
    }
  })

  runEveryMinute(async () => {
    for (const iface of interfaces) {
      await saveAverage(iface.name)
    }
  })
})
