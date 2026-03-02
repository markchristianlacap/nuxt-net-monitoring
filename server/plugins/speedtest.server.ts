import { db } from '../db'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const frequencySeconds = Number.parseInt(config.SPEEDTEST_FREQUENCY || '3600', 10)

  runEveryInterval(frequencySeconds, async () => {
    const res = await runSpeedtest()
    await db.insertInto('speedtest_results').values({
      download: res.download.bandwidth,
      upload: res.upload.bandwidth,
      latency: res.ping.latency,
      ip: res.server.ip,
      isp: res.isp,
      timestamp: new Date().toISOString(),
      url: res.result.url,
    }).execute()
  })
})
