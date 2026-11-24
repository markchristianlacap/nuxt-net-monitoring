import { runScheduledSpeedtests, updateSpeedtestStatus } from '../utils/speedtest'

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

    const enabled = settings.features.speedtest
    const interfaceNames = [...settings.speedtest.localInterfaceNames]
    if (interfaceNames.length === 0)
      interfaceNames.push('System default')

    updateSpeedtestStatus({
      enabled,
      interfaces: enabled
        ? interfaceNames
        : [],
      frequencySeconds: enabled ? settings.speedtest.frequencySeconds : null,
      nextRunAt: enabled
        ? new Date(Date.now() + settings.speedtest.frequencySeconds * 1000).toISOString()
        : null,
    })

    if (!enabled)
      return

    const activeGeneration = generation
    stopScheduledTest = runEveryInterval(settings.speedtest.frequencySeconds, async () => {
      if (activeGeneration !== generation)
        return

      const selectedInterfaces: Array<string | null> = [...settings.speedtest.localInterfaceNames]
      if (selectedInterfaces.length === 0)
        selectedInterfaces.push(null)

      await runScheduledSpeedtests(selectedInterfaces, () => activeGeneration === generation)

      if (activeGeneration === generation) {
        updateSpeedtestStatus({
          nextRunAt: new Date(Date.now() + settings.speedtest.frequencySeconds * 1000).toISOString(),
        })
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
