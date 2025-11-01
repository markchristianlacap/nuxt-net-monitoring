import type { PingResult } from '#shared/types/ping'
import { spawn } from 'node:child_process'
import { db } from '../db'
import { events } from '../utils/events'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const pingHostsConfig = config.PING_HOST
  const hosts = pingHostsConfig.split(',').map(h => h.trim()).filter(Boolean)

  if (hosts.length === 0) {
    console.warn('No ping hosts configured in NUXT_PING_HOST')
    return
  }

  // Store ping data per host
  const pingsPerHost = new Map<string, PingResult[]>()
  hosts.forEach(host => pingsPerHost.set(host, []))

  const saveAverage = async (host: string) => {
    const pings = pingsPerHost.get(host) || []
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
    pingsPerHost.set(host, [])
  }

  // Start ping process for each host
  hosts.forEach((host) => {
    const ping = spawn('ping', ['-i', '1', host])

    ping.stdout.on('data', async (data) => {
      const latencyMatch = data.toString().match(/time=([\d.]+) ms/)
      const latency = latencyMatch ? Number.parseFloat(latencyMatch[1]) : 0
      const currentPing: PingResult = {
        host,
        status: latency > 0 ? 'online' : 'offline',
        latency,
        timestamp: new Date().toISOString(),
      }
      events.emit('ping:update', currentPing)
      const hostPings = pingsPerHost.get(host) || []
      hostPings.push(currentPing)
      pingsPerHost.set(host, hostPings)
    })

    ping.on('error', (err) => {
      console.error(`Ping process error for host ${host}:`, err)
    })

    // Save average for each host every minute
    setInterval(() => saveAverage(host), 60_000)
  })

  console.log(`Ping monitoring started for ${hosts.length} host(s): ${hosts.join(', ')}`)
})
