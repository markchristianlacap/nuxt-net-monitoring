export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-cache')
  setHeader(event, 'connection', 'keep-alive')
  setHeader(event, 'content-type', 'text/event-stream')
  setResponseStatus(event, 200)
  let counter = 0
  const sendEvent = async () => {
    try {
      const data = await getBandwidth()
      if (!data)
        return
      event.node.res.write(`id: ${++counter}\n`)
      event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
    catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      event.node.res.write(`event: error\ndata: ${JSON.stringify(errMsg)}\n\n`)
    }
  }

  await sendEvent()
  const interval = setInterval(sendEvent, 1000)

  event.node.req.on('close', () => {
    clearInterval(interval)
    event.node.res.end()
  })

  event._handled = true
})
