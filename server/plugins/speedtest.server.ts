import { db } from '../db'

export default defineNitroPlugin(async () => {
  runEveryHour(async () => {
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
