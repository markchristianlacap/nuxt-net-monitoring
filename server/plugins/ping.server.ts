import { spawn } from 'node:child_process'

import { db } from '../db'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const host = config.PING_HOST
  const ping = spawn('ping', ['-i', '1', host])
  ping.stdout.on('data', async (data) => {
    const latency = Number.parseFloat(data.toString().match(/time=([\d.]+) ms/)?.[1] || '0')
    const status = latency > 0 ? 'online' : 'offline'
    await db.insertInto('pings').values({
      host,
      latency,
      status,
      timestamp: new Date().toISOString(),
    }).execute()
  })
})
