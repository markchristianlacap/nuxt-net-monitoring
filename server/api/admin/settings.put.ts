import { getAppSettings, normalizeAppSettings, saveAppSettings } from '../../utils/app-settings'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const previous = await getAppSettings()
  const settings = normalizeAppSettings(body?.settings, previous)
  await saveAppSettings(settings)
  return { success: true }
})
