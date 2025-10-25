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

  async function pingHost() {
    try {
      const result = await db
        .selectFrom('pings')
        .where('host', '=', host)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .selectAll()
        .executeTakeFirst()

      if (!result) throw new Error('No ping found')
      return result
    } catch {
      return {
        host,
        status: 'offline' as const,
        latency: null,
        timestamp: new Date().toISOString()
      }
    }
  }

  runEverySecond(async () => {
    const data = await pingHost()
    res.write(`id: ${++counter}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  })

  event.node.req.on('close', () => {
    console.log('Client disconnected')
    res.end()
  })
})
