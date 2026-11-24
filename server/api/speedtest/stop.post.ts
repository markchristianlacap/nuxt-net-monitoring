export default defineEventHandler(async () => ({
  stopped: await stopManualSpeedtest(),
}))
