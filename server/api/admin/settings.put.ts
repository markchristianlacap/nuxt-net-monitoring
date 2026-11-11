import { getAppSettings, normalizeAppSettings, saveAppSettings } from '../../utils/app-settings'
import { getAvailableSpeedtestInterfaces } from '../../utils/speedtest-interfaces'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const previous = await getAppSettings()
  const settings = normalizeAppSettings(body?.settings, previous)
  const interfaceName = settings.speedtest.localInterfaceName
  if (interfaceName && !getAvailableSpeedtestInterfaces().some(item => item.name === interfaceName)) {
    throw createError({ statusCode: 400, statusMessage: 'Selected scheduled-test interface is not available to the application' })
  }
  await saveAppSettings(settings)
  return { success: true }
})
