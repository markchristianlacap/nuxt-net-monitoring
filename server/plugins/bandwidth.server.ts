import { db } from '../db'
import { bandwidths } from '../db/schema/bandwidths'

export default defineNitroPlugin(async () => {
  let stopPolling: (() => void) | undefined
  let stopAveraging: (() => void) | undefined
  let generation = 0
  let applyQueue = Promise.resolve()

  function stop() {
    generation++
    stopPolling?.()
    stopAveraging?.()
    stopPolling = undefined
    stopAveraging = undefined
  }

  async function start(settings: AppSettings) {
    stop()
    resetDeviceContexts()
    if (!settings.features.bandwidth || !settings.snmp.devices.length)
      return

    const activeGeneration = generation
    const results = new Map<string, BandwidthResult[]>()
    const keyFor = (host: string, iface: string) => `${host}\u0000${iface}`

    async function saveAverage(host: string, iface: string) {
      const key = keyFor(host, iface)
      const records = results.get(key)
      if (!records?.length || activeGeneration !== generation)
        return

      const avgIn = records.reduce((sum, record) => sum + record.inMbps, 0) / records.length
      const avgOut = records.reduce((sum, record) => sum + record.outMbps, 0) / records.length
      await db.insert(bandwidths).values({
        inMbps: avgIn,
        outMbps: avgOut,
        timestamp: new Date(),
        displayName: records[0]!.displayName,
        interface: iface,
        host: records[0]!.host,
      })
      results.set(key, [])
    }

    stopPolling = runEverySecond(async () => {
      const interfaces = await getInterfaces()
      if (activeGeneration !== generation)
        return

      for (const iface of interfaces) {
        const bandwidth = await getBandwidth(iface.host, iface.name)
        if (!bandwidth || activeGeneration !== generation)
          continue
        events.emit('bandwidth:update', bandwidth)
        const key = keyFor(iface.host, iface.name)
        if (!results.has(key))
          results.set(key, [bandwidth])
        else
          results.get(key)?.push(bandwidth)
      }
    })

    stopAveraging = runEveryMinute(async () => {
      const interfaces = await getInterfaces()
      if (activeGeneration !== generation)
        return
      for (const iface of interfaces)
        await saveAverage(iface.host, iface.name)
    })
  }

  const apply = (settings: AppSettings) => {
    applyQueue = applyQueue
      .then(() => start(settings))
      .catch(error => console.error('Unable to reconfigure bandwidth monitoring:', error))
    return applyQueue
  }

  subscribeToAppSettings(apply)
  await apply(await getAppSettings())
})
