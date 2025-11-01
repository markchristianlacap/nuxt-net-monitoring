import { events } from '~~/server/utils/events'

export default defineEventHandler(async (event) => {
  const res = event.node.res
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Content-Type', 'text/event-stream')
  res.flushHeaders?.()
  let counter = 0
  events.on('ping:update', (data) => {
    res.write(`id: ${++counter}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  })
  event.node.req.on('close', () => {
    res.end()
  })
})
