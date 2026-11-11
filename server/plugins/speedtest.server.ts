import { toMbps } from '../../shared/utils/converter'
import { db } from '../db'
import { speedtestResults } from '../db/schema/speedtest-results'

const emptyProgress: ScheduledSpeedtestProgress = {
  phase: 'starting',
  progress: 0,
  downloadMbps: null,
  uploadMbps: null,
  latencyMs: null,
  isp: null,
  publicIp: null,
  resultUrl: null,
}

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
        currentTest: null,
        nextRunAt: null,
      })

      try {
        for (const [index, interfaceName] of selectedInterfaces.entries()) {
          if (activeGeneration !== generation)
            return

          updateSpeedtestScheduleStatus({
            currentInterface: interfaceName ?? 'System default',
            currentIndex: index + 1,
            currentTest: { ...emptyProgress },
          })

          try {
            const result = await runSpeedtest(interfaceName, (event) => {
              const currentTest = getSpeedtestScheduleStatus().currentTest ?? { ...emptyProgress }
              const progress = { ...currentTest }

              switch (event.type) {
                case 'testStart':
                  Object.assign(progress, {
                    ...emptyProgress,
                    phase: 'ping',
                    isp: event.isp ?? null,
                    publicIp: event.interface?.externalIp ?? null,
                  })
                  break
                case 'ping':
                  progress.phase = 'ping'
                  progress.progress = event.ping?.progress ?? progress.progress
                  progress.latencyMs = event.ping?.latency ?? progress.latencyMs
                  break
                case 'download':
                  progress.phase = 'download'
                  progress.progress = event.download?.progress ?? progress.progress
                  if (event.download?.bandwidth !== undefined)
                    progress.downloadMbps = toMbps(event.download.bandwidth)
                  break
                case 'upload':
                  progress.phase = 'upload'
                  progress.progress = event.upload?.progress ?? progress.progress
                  if (event.upload?.bandwidth !== undefined)
                    progress.uploadMbps = toMbps(event.upload.bandwidth)
                  break
                case 'result':
                  progress.phase = 'complete'
                  progress.progress = 1
                  progress.latencyMs = event.ping?.latency ?? progress.latencyMs
                  if (event.download?.bandwidth !== undefined)
                    progress.downloadMbps = toMbps(event.download.bandwidth)
                  if (event.upload?.bandwidth !== undefined)
                    progress.uploadMbps = toMbps(event.upload.bandwidth)
                  progress.isp = event.isp ?? progress.isp
                  progress.publicIp = event.interface?.externalIp ?? progress.publicIp
                  progress.resultUrl = event.result?.url ?? progress.resultUrl
                  break
              }

              updateSpeedtestScheduleStatus({ currentTest: progress })
            })
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
              currentTest: {
                ...(getSpeedtestScheduleStatus().currentTest ?? { ...emptyProgress }),
                phase: 'complete',
              },
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
              currentTest: {
                ...(getSpeedtestScheduleStatus().currentTest ?? { ...emptyProgress }),
                phase: 'error',
              },
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
            currentTest: null,
            nextRunAt: new Date(Date.now() + settings.speedtest.frequencySeconds * 1000).toISOString(),
          })
        }
        else {
          updateSpeedtestScheduleStatus({
            running: false,
            currentInterface: null,
            currentIndex: null,
            currentTest: null,
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
