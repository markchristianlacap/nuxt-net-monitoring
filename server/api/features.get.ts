export default defineEventHandler(async () => {
  const { features } = await getAppSettings()
  return { features }
})
