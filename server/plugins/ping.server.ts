import { spawn } from 'node:child_process'
import { db } from '../db'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const host = config.PING_HOST

  const ping = spawn('ping', ['-i', '1', host])

  let latencies: number[] = []
  const saveAverage = async () => {
    if (latencies.length === 0)
      return

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
    const status = avgLatency > 0 ? 'online' : 'offline'

    await db.insertInto('pings').values({
      host,
      latency: Math.round(avgLatency * 100) / 100,
      status,
      timestamp: new Date().toISOString(),
    }).execute()

    latencies = []
  }

  ping.stdout.on('data', async (data) => {
    const latencyMatch = data.toString().match(/time=([\d.]+) ms/)
    const latency = latencyMatch ? Number.parseFloat(latencyMatch[1]) : 0
    latencies.push(latency)
  })

  setInterval(saveAverage, 60_000)
})
