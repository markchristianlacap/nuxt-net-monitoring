import { db } from '../db'
import { speedtestResults } from '../db/schema/speedtest-results'

export default defineNitroPlugin(async () => {
  let stopScheduledTest: (() => void) | undefined
  let generation = 0
  let applyQueue = Promise.resolve()
  let scheduledTestRunning = false

  function stop() {
    generation++
    stopScheduledTest?.()
    stopScheduledTest = undefined
  }

  async function start(settings: AppSettings) {
    stop()
    const enabled = settings.features.speedtest
    const interfaceNames = [...settings.speedtest.localInterfaceNames]
    if (interfaceNames.length === 0)
      interfaceNames.push('System default')

    let scheduledInterfaces: string[] = []
    let nextRunAt: string | null = null
    let frequencySeconds: number | null = null
    if (enabled) {
      scheduledInterfaces = interfaceNames
      frequencySeconds = settings.speedtest.frequencySeconds
      nextRunAt = new Date(Date.now() + frequencySeconds * 1000).toISOString()
    }

    updateSpeedtestScheduleStatus({
      enabled,
      running: scheduledTestRunning,
      interfaces: scheduledInterfaces,
      frequencySeconds,
      nextRunAt,
    })

    if (!settings.features.speedtest)
      return

    const activeGeneration = generation
    stopScheduledTest = runEveryInterval(settings.speedtest.frequencySeconds, async () => {
      if (scheduledTestRunning) {
        updateSpeedtestScheduleStatus({
          nextRunAt: new Date(Date.now() + settings.speedtest.frequencySeconds * 1000).toISOString(),
        })
        return
      }

      scheduledTestRunning = true
      const selectedInterfaces: Array<string | null> = [...settings.speedtest.localInterfaceNames]
      if (selectedInterfaces.length === 0)
        selectedInterfaces.push(null)

      updateSpeedtestScheduleStatus({
        running: true,
        currentInterface: null,
        currentIndex: null,
        nextRunAt: null,
      })

      try {
        for (const [index, interfaceName] of selectedInterfaces.entries()) {
          if (activeGeneration !== generation)
            return

          updateSpeedtestScheduleStatus({
            currentInterface: interfaceName ?? 'System default',
            currentIndex: index + 1,
          })

          try {
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
            updateSpeedtestScheduleStatus({
              lastAttempt: {
                interfaceName: interfaceName || result.interface.name || 'System default',
                completedAt: new Date().toISOString(),
                status: 'success',
              },
            })
          }
          catch (error) {
            if (activeGeneration !== generation)
              return
            console.error(`Scheduled speed test failed for ${interfaceName ?? 'system default'}:`, error)
            updateSpeedtestScheduleStatus({
              lastAttempt: {
                interfaceName: interfaceName ?? 'System default',
                completedAt: new Date().toISOString(),
                status: 'failed',
              },
            })
          }
        }
      }
      finally {
        scheduledTestRunning = false
        if (activeGeneration === generation) {
          updateSpeedtestScheduleStatus({
            running: false,
            currentInterface: null,
            currentIndex: null,
            nextRunAt: new Date(Date.now() + settings.speedtest.frequencySeconds * 1000).toISOString(),
          })
        }
        else {
          updateSpeedtestScheduleStatus({
            running: false,
            currentInterface: null,
            currentIndex: null,
          })
        }
      }
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
