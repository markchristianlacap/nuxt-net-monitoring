import { spawn } from 'node:child_process'
import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const res = event.node.res
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Content-Type', 'text/event-stream')
  res.flushHeaders?.()
  let counter = 0
  const speedtest = spawn('speedtest', ['-f', 'jsonl', '--accept-license'])
  speedtest.stdout.on('data', async (data) => {
    try {
      res.write(`id: ${++counter}\n`)
      res.write(`data: ${data.toString()}\n\n`)

      const payload = JSON.parse(data.toString())
      if (payload.type === 'result') {
        const result = payload as SpeedtestResult
        await db.insertInto('speedtest_results').values({
          download: result.download.bandwidth,
          upload: result.upload.bandwidth,
          latency: result.ping.latency,
          ip: result.interface.externalIp,
          isp: result.isp,
          timestamp: new Date().toISOString(),
          url: result.result.url,
        }).execute()
      }
    }
    catch (error) {
      console.error('Error processing speedtest data:', error)
      res.write(`id: ${++counter}\n`)
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to process data' })}\n\n`)
    }
  })

  event.node.req.on('close', () => {
    res.end()
  })
})
