import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  // SSE headers
  setHeader(event, 'cache-control', 'no-cache')
  setHeader(event, 'connection', 'keep-alive')
  setHeader(event, 'content-type', 'text/event-stream')
  setResponseStatus(event, 200)
  let lastId = 0
  const sendEvent = async () => {
    try {
      const res = await db.selectFrom('bandwidths').selectAll().orderBy('timestamp', 'desc').limit(1).executeTakeFirst()
      if (!res)
        return
      if (res.inMbps < 0 || res.outMbps < 0)
        return
      const data = {
        inMbps: Number.parseFloat(res.inMbps.toFixed(2)),
        outMbps: Number.parseFloat(res.outMbps.toFixed(2)),
        timestamp: res.timestamp,
        host: res.host,
      }
      if (res.id === lastId)
        return

      lastId = res.id
      event.node.res.write(`id: ${res.id}\n`)
      event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
    catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      event.node.res.write(`event: error\ndata: ${JSON.stringify(errMsg)}\n\n`)
    }
  }

  // Send immediately, then every second
  await sendEvent()
  const interval = setInterval(sendEvent, 1000)

  // Handle client disconnect
  event.node.req.on('close', () => {
    clearInterval(interval)
    event.node.res.end()
  })

  // Prevent Nitro from closing the connection
  event._handled = true
})
