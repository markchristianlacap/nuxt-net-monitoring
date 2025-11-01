import type { BandwidthResult } from '~~/shared/types/bandwidth'
import { db } from '../db'

export default defineNitroPlugin(() => {
  let records: BandwidthResult[] = []
  const host = useRuntimeConfig().SNMP_HOST
  runEverySecond(async () => {
    const bandwidth = await getBandwidth()
    events.emit('bandwidth:update', bandwidth)
    if (!bandwidth)
      return
    records.push(bandwidth)
  })
  async function saveAverage() {
    if (records.length === 0)
      return
    const avgIn = records.reduce((a, b) => a + b.inMbps, 0) / records.length
    const avgOut = records.reduce((a, b) => a + b.outMbps, 0) / records.length
    await db.insertInto('bandwidths').values({
      inMbps: avgIn,
      outMbps: avgOut,
      timestamp: new Date().toISOString(),
      host,
    }).execute()

    records = []
  }

  setInterval(saveAverage, 60_000)
})
