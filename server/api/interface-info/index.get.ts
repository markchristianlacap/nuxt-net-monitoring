import { getAllInterfaceInfo } from '~/server/utils/bandwidth'

export default defineEventHandler(() => {
  const interfaceInfos = getAllInterfaceInfo()
  return interfaceInfos
})
