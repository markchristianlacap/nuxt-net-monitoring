import { db } from '../db'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  setInterval(async () => {
    const { host, status, latency } = await pingHost(config.PING_HOST)
    await db.insertInto('pings').values({
      host,
      status: status === 'online' ? 'online' : 'offline',
      latency,
      timestamp: new Date().toISOString()
    }).execute()
  }, 1000)
})
