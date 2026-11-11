import { db } from '../db'
import { bandwidths } from '../db/schema/bandwidths'

export default defineNitroPlugin(async () => {
  let stopPolling: Array<() => void> = []
  let stopAveraging: (() => void) | undefined
  let generation = 0
  let applyQueue = Promise.resolve()

  function stop() {
    generation++
    stopPolling.forEach(stopTask => stopTask())
    stopAveraging?.()
    stopPolling = []
    stopAveraging = undefined
  }

  async function start(settings: AppSettings) {
    stop()
    resetDeviceContexts()
    if (!settings.features.bandwidth || !settings.snmp.devices.length)
      return

    const activeGeneration = generation
    const results = new Map<string, BandwidthResult[]>()
    const lastEmittedStatus = new Map<string, DeviceStatus['status']>()
    const keyFor = (host: string, iface: string) => `${host}\u0000${iface}`

    function emitDeviceStatus(host: string) {
      const status = getDeviceStatus(host)
      if (!status || lastEmittedStatus.get(host) === status.status)
        return
      lastEmittedStatus.set(host, status.status)
      events.emit('bandwidth:device-status', status)
    }

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

    await getDeviceStatuses()

    async function pollDevice(host: string) {
      const interfaces = await getDeviceInterfacesForHost(host)
      if (activeGeneration !== generation)
        return

      const deviceStatus = getDeviceStatus(host)
      if (deviceStatus?.status === 'down') {
        emitDeviceStatus(host)
        return
      }

      for (const iface of interfaces) {
        const bandwidth = await getBandwidth(host, iface.name)
        if (activeGeneration !== generation)
          return

        const updatedStatus = getDeviceStatus(host)
        if (updatedStatus?.status === 'down')
          break
        if (!bandwidth)
          continue

        events.emit('bandwidth:update', bandwidth)
        const key = keyFor(iface.host, iface.name)
        if (!results.has(key))
          results.set(key, [bandwidth])
        else
          results.get(key)?.push(bandwidth)
      }
      emitDeviceStatus(host)
    }

    stopPolling = settings.snmp.devices.map(({ host }) => runEverySecond(() => pollDevice(host)))

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
