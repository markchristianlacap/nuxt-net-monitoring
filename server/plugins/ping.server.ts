import type { PingResult } from '#shared/types/ping'
import { spawn } from 'node:child_process'
import { db } from '../db'
import { events } from '../utils/events'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const host = config.PING_HOST
  let currentPing: PingResult | null = null
  const ping = spawn('ping', ['-i', '1', host])
  let pings: PingResult[] = []
  const saveAverage = async () => {
    if (pings.length === 0)
      return

    const avgLatency = pings.reduce((a, b) => a + b.latency, 0) / pings.length
    const status = avgLatency > 0 ? 'online' : 'offline'

    await db.insertInto('pings').values({
      host,
      latency: Math.round(avgLatency * 100) / 100,
      status,
      timestamp: new Date().toISOString(),
    }).execute()
    pings = []
  }

  ping.stdout.on('data', async (data) => {
    const latencyMatch = data.toString().match(/time=([\d.]+) ms/)
    const latency = latencyMatch ? Number.parseFloat(latencyMatch[1]) : 0
    currentPing = {
      host,
      status: latency > 0 ? 'online' : 'offline',
      latency,
      timestamp: new Date().toISOString(),
    }
    events.emit('ping:update', currentPing)
    pings.push(currentPing)
  })

  setInterval(saveAverage, 60_000)
})
