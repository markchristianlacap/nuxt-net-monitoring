import type { AppSettings } from '~~/shared/types/settings'
import { db } from '../db'
import { speedtestResults } from '../db/schema/speedtest-results'
import { getAppSettings, subscribeToAppSettings } from '../utils/app-settings'
import { runEveryInterval } from '../utils/helper'
import { runSpeedtest } from '../utils/speedtest'

export default defineNitroPlugin(async () => {
  let stopScheduledTest: (() => void) | undefined
  let generation = 0
  let applyQueue = Promise.resolve()

  function stop() {
    generation++
    stopScheduledTest?.()
    stopScheduledTest = undefined
  }

  async function start(settings: AppSettings) {
    stop()
    if (!settings.features.speedtest)
      return

    const activeGeneration = generation
    stopScheduledTest = runEveryInterval(settings.speedtest.frequencySeconds, async () => {
      const interfaceName = settings.speedtest.localInterfaceName
      const result = await runSpeedtest(interfaceName)
      if (activeGeneration !== generation)
        return

      await db.insert(speedtestResults).values({
        download: result.download.bandwidth,
        upload: result.upload.bandwidth,
        latency: result.ping.latency,
        ip: result.interface.externalIp,
        isp: result.isp,
        timestamp: new Date(),
        networkInterface: interfaceName || result.interface.name || null,
        url: result.result.url,
      })
    })
  }

  const apply = (settings: AppSettings) => {
    applyQueue = applyQueue
      .then(() => start(settings))
      .catch(error => console.error('Unable to reconfigure scheduled speed tests:', error))
    return applyQueue
  }

  subscribeToAppSettings(apply)
  await apply(await getAppSettings())
})
