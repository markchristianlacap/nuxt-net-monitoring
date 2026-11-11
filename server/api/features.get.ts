import { getAppSettings } from '../utils/app-settings'

export default defineEventHandler(async () => {
  const { features } = await getAppSettings()
  return { features }
})
