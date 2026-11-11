import { getAppSettings, normalizeAppSettings, saveAppSettings } from '../../utils/app-settings'
import { getAvailableSpeedtestInterfaces } from '../../utils/speedtest-interfaces'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const previous = await getAppSettings()
  const settings = normalizeAppSettings(body?.settings, previous)
  const availableInterfaces = new Set(getAvailableSpeedtestInterfaces().map(item => item.name))
  if (settings.speedtest.localInterfaceNames.some(interfaceName => !availableInterfaces.has(interfaceName))) {
    throw createError({ statusCode: 400, statusMessage: 'One or more selected scheduled-test interfaces are not available to the application' })
  }
  await saveAppSettings(settings)
  return { success: true }
})
