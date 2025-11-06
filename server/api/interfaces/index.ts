export default defineEventHandler(async () => {
  const interfaces = await getInterfaces()
  return interfaces
})
