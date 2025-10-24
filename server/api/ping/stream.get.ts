import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export default defineEventHandler(async (event) => {
  // optional: disable in production if needed
  // if (!process.dev) return { disabled: true }

  // SSE headers
  setHeader(event, 'cache-control', 'no-cache')
  setHeader(event, 'connection', 'keep-alive')
  setHeader(event, 'content-type', 'text/event-stream')
  setResponseStatus(event, 200)

  let counter = 0
  const host = '136.158.221.97' // your target (or gateway, e.g. 192.168.1.1)

  async function pingHost() {
    try {
      const { stdout } = await execAsync(`ping -c 1 ${host}`)
      const match = stdout.match(/time=([\d.]+) ms/)
      const latency = match ? parseFloat(match[1]) : null
      return {
        host,
        status: 'online',
        latency,
        timestamp: new Date().toISOString()
      }
    } catch {
      return {
        host,
        status: 'offline',
        latency: null,
        timestamp: new Date().toISOString()
      }
    }
  }

  const sendEvent = async () => {
    const data = await pingHost()
    event.node.res.write(`id: ${++counter}\n`)
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // send immediately, then every 1 second
  await sendEvent()
  const interval = setInterval(sendEvent, 1000)

  // close connection on client disconnect
  event.node.req.on('close', () => {
    clearInterval(interval)
    event.node.res.end()
  })

  // keep the connection open
  event._handled = true
})

