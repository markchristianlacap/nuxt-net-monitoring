export default defineEventHandler(async (event) => {
  const body = await readBody<{ interfaceName?: unknown, serverId?: unknown }>(event)
  const interfaceName = validateSpeedtestInterface(body?.interfaceName)
  const serverId = validateSpeedtestServerId(body?.serverId)

  if (!startManualSpeedtest(interfaceName, serverId)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A speed test is already running. Wait for it to finish before starting another.',
    })
  }

  setResponseStatus(event, 202)
  return { started: true }
})
