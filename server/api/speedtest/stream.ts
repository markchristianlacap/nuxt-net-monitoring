export default defineEventHandler((event) => {
  const res = event.node.res
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  let closed = false
  const writeStatus = (status: SpeedtestStatus) => {
    if (!closed)
      res.write(`data: ${JSON.stringify(status)}\n\n`)
  }
  const unsubscribe = subscribeToSpeedtestStatus(writeStatus)
  const heartbeat = setInterval(() => {
    if (!closed)
      res.write(': keep-alive\n\n')
  }, 15_000)
  const cleanup = () => {
    if (closed)
      return
    closed = true
    clearInterval(heartbeat)
    unsubscribe()
  }

  res.on('close', cleanup)
  res.write('retry: 3000\n\n')
  writeStatus(getSpeedtestStatus())
  event._handled = true
})
