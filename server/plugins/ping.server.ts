import type { AppSettings } from '~~/shared/types/settings'
import { spawn } from 'node:child_process'
import { db } from '../db'
import { pings as pingTable } from '../db/schema/pings'
import { getAppSettings, subscribeToAppSettings } from '../utils/app-settings'
import { runEveryMinute } from '../utils/helper'

export default defineNitroPlugin(async () => {
  let stopAveraging: (() => void) | undefined
  let childProcesses: ReturnType<typeof spawn>[] = []
  let applyQueue = Promise.resolve()

  async function stop() {
    stopAveraging?.()
    stopAveraging = undefined
    for (const child of childProcesses)
      child.kill('SIGTERM')
    childProcesses = []
  }

  async function start(settings: AppSettings) {
    await stop()
    const hosts = settings.features.ping
      ? [
          ...new Set(settings.ping.hosts.map(host => host.trim()).filter(Boolean)),
        ]
      : []
    if (!hosts.length)
      return

    const pingsPerHost = new Map<string, PingResult[]>(hosts.map(host => [host, []]))
    const activeChildren: ReturnType<typeof spawn>[] = []
    childProcesses = activeChildren

    for (const host of hosts) {
      const child = spawn('ping', ['-i', '1', host])
      activeChildren.push(child)

      child.stdout.on('data', (data) => {
        if (childProcesses !== activeChildren)
          return
        const latencyMatch = data.toString().match(/time=([\d.]+) ms/)
        const latency = latencyMatch
          ? Number.parseFloat(latencyMatch[1])
          : 0
        const currentPing: PingResult = {
          host,
          status: latency > 0
            ? 'online'
            : 'offline',
          latency,
          timestamp: new Date().toISOString(),
        }
        events.emit('ping:update', currentPing)
        pingsPerHost.get(host)?.push(currentPing)
      })

      child.on('error', (error) => {
        console.error(`Ping process error for host ${host}:`, error)
      })
    }

    stopAveraging = runEveryMinute(async () => {
      for (const host of hosts) {
        const samples = pingsPerHost.get(host) ?? []
        if (!samples.length)
          continue

        const avgLatency = samples.reduce((sum, sample) => sum + sample.latency, 0) / samples.length
        await db.insert(pingTable).values({
          host,
          latency: Math.round(avgLatency * 100) / 100,
          status: avgLatency > 0
            ? 'online'
            : 'offline',
          timestamp: new Date(),
        })
        pingsPerHost.set(host, [])
      }
    })
  }

  const apply = (settings: AppSettings) => {
    applyQueue = applyQueue
      .then(() => start(settings))
      .catch(error => console.error('Unable to reconfigure ping monitoring:', error))
    return applyQueue
  }

  subscribeToAppSettings(apply)
  await apply(await getAppSettings())
})
