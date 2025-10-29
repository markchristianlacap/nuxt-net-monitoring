import { spawn } from 'node:child_process'

export default defineEventHandler(async (event) => {
  const res = event.node.res
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Content-Type', 'text/event-stream')
  res.flushHeaders?.()
  let counter = 0
  const config = useRuntimeConfig()
  const host = config.PING_HOST

  const ping = spawn('ping', ['-i', '1', host])

  ping.stdout.on('data', (raw) => {
    res.write(`id: ${++counter}\n`)
    const latencyMatch = raw.toString().match(/time=([\d.]+) ms/)
    const latency: number = latencyMatch ? Number(latencyMatch[1]) : 0
    const data = {
      latency,
      timestamp: new Date().toISOString(),
      status: latency > 0 ? 'online' : 'offline',
      host,
    }
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  })

  ping.on('error', (error) => {
    console.error(error)
    res.end()
  })

  event.node.req.on('close', () => {
    res.end()
  })
})
