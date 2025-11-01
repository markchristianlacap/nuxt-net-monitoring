export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-cache')
  setHeader(event, 'connection', 'keep-alive')
  setHeader(event, 'content-type', 'text/event-stream')
  setResponseStatus(event, 200)
  let counter = 0
  events.on('bandwidth:update', (data) => {
    event.node.res.write(`id: ${++counter}\n`)
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
  })
  event.node.req.on('close', () => {
    event.node.res.end()
  })

  event._handled = true
})
