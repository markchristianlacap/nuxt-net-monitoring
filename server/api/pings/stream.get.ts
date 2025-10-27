import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const res = event.node.res
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Content-Type', 'text/event-stream')
  res.flushHeaders?.()
  let counter = 0
  const config = useRuntimeConfig()
  const host = config.PING_HOST
  let lastId = 0
  async function pingHost() {
    try {
      const result = await db
        .selectFrom('pings')
        .where('host', '=', host)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .selectAll()
        .executeTakeFirst()
      return result
    }
    catch {
      return {
        id: 0,
        host,
        status: 'offline' as const,
        latency: null,
        timestamp: new Date().toISOString(),
      }
    }
  }

  runEverySecond(async () => {
    const data = await pingHost()
    if (!data || data.id === lastId) {
      return
    }
    lastId = data.id
    res.write(`id: ${++counter}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  })

  event.node.req.on('close', () => {
    res.end()
  })
})
