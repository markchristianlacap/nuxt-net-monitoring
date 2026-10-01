export default defineEventHandler(async (event) => {
  const res = event.node.res
  setHeader(event, 'cache-control', 'no-cache, no-transform')
  setHeader(event, 'connection', 'keep-alive')
  setHeader(event, 'content-type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'x-accel-buffering', 'no')
  setResponseStatus(event, 200)
  res.flushHeaders?.()

  let counter = 0
  let closed = false
  const onBandwidthUpdate = (data: BandwidthResult) => {
    if (closed)
      return
    res.write(`id: ${++counter}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }
  const heartbeat = setInterval(() => {
    if (!closed)
      res.write(': keep-alive\n\n')
  }, 15_000)
  const cleanup = () => {
    if (closed)
      return
    closed = true
    clearInterval(heartbeat)
    events.off('bandwidth:update', onBandwidthUpdate)
  }

  events.on('bandwidth:update', onBandwidthUpdate)
  res.write('retry: 3000\n\n')
  res.on('close', cleanup)

  event._handled = true
})
