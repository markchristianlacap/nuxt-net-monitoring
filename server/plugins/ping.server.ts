import { db } from '../db'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  runEverySecond(async () => {
    const { host, status, latency, timestamp } = await pingHost(config.PING_HOST)
    await db.insertInto('pings').values({
      host,
      status: status as 'online' | 'offline',
      latency,
      timestamp
    }).execute()
  })
})
