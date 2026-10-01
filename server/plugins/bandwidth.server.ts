import { db } from '../db'

export default defineNitroPlugin(async () => {
  const results = new Map<string, BandwidthResult[]>()

  const keyFor = (host: string, iface: string) => `${host}\u0000${iface}`

  async function saveAverage(host: string, iface: string) {
    const key = keyFor(host, iface)
    const records = results.get(key)
    if (!records?.length)
      return
    const avgIn = records.reduce((a, b) => a + b.inMbps, 0) / records.length
    const avgOut = records.reduce((a, b) => a + b.outMbps, 0) / records.length
    await db.insertInto('bandwidths').values({
      inMbps: avgIn,
      outMbps: avgOut,
      timestamp: new Date().toISOString(),
      displayName: records[0]!.displayName,
      interface: iface,
      host: records[0]!.host,
    }).execute()
    results.set(key, [])
  }

  runEverySecond(async () => {
    const interfaces = await getInterfaces()
    for (const iface of interfaces) {
      const bandwidth = await getBandwidth(iface.host, iface.name)
      if (!bandwidth)
        continue
      events.emit('bandwidth:update', bandwidth)
      const key = keyFor(iface.host, iface.name)
      if (!results.has(key)) {
        results.set(key, [bandwidth])
      }
      else {
        results.get(key)?.push(bandwidth)
      }
    }
  })

  runEveryMinute(async () => {
    const interfaces = await getInterfaces()
    for (const iface of interfaces) {
      await saveAverage(iface.host, iface.name)
    }
  })
})
