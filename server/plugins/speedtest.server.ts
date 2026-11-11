import { db } from '../db'
import { speedtestResults } from '../db/schema/speedtest-results'
import { getNetworkConfig } from '../utils/network-config'

export default defineNitroPlugin(async () => {
  const { frequencySeconds } = getNetworkConfig().speedtest

  runEveryInterval(frequencySeconds, async () => {
    const res = await runSpeedtest()
    await db.insert(speedtestResults).values({
      download: res.download.bandwidth,
      upload: res.upload.bandwidth,
      latency: res.ping.latency,
      ip: res.interface.externalIp,
      isp: res.isp,
      timestamp: new Date(),
      url: res.result.url,
    })
  })
})
