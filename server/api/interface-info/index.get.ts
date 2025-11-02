import { getInterfaceInfoCached } from '~/server/utils/bandwidth'

export default defineEventHandler(() => {
  const interfaceInfo = getInterfaceInfoCached()
  return interfaceInfo
})
