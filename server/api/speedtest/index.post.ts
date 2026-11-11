import { spawn } from 'node:child_process'
import { readBody } from 'h3'
import { db } from '~~/server/db'
import { speedtestResults } from '~~/server/db/schema/speedtest-results'
import { validateSpeedtestInterface } from '~~/server/utils/speedtest-interfaces'

interface SpeedtestRequestBody {
  interfaceName?: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SpeedtestRequestBody>(event)
  const interfaceName = validateSpeedtestInterface(body?.interfaceName)
  const res = event.node.res
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Content-Type', 'text/event-stream')
  res.flushHeaders?.()
  let counter = 0
  let outputBuffer = ''
  let stderr = ''
  let clientDisconnected = false
  let processError = false
  let outputQueue = Promise.resolve()
  const interfaceArgs = interfaceName
    ? ['--interface', interfaceName]
    : []
  const speedtest = spawn('speedtest', [
    ...interfaceArgs,
    '-f',
    'jsonl',
    '--accept-license',
  ])

  const sendEvent = (payload: unknown) => {
    res.write(`id: ${++counter}\n`)
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const processLine = async (line: string) => {
    if (!line.trim())
      return
    try {
      res.write(`id: ${++counter}\n`)
      res.write(`data: ${line}\n\n`)

      const payload = JSON.parse(line)
      if (payload.type === 'result') {
        const result = payload as SpeedtestResult
        await db.insert(speedtestResults).values({
          download: result.download.bandwidth,
          upload: result.upload.bandwidth,
          latency: result.ping.latency,
          ip: result.interface.externalIp,
          isp: result.isp,
          timestamp: new Date(),
          networkInterface: interfaceName || result.interface.name || null,
          url: result.result.url,
        })
      }
    }
    catch (error) {
      console.error('Error processing speedtest data:', error)
      sendEvent({ type: 'error', message: 'Failed to process speed-test data.' })
    }
  }

  speedtest.stdout.on('data', (data) => {
    outputBuffer += data.toString()
    const lines = outputBuffer.split(/\r?\n/)
    outputBuffer = lines.pop() ?? ''
    outputQueue = outputQueue.then(async () => {
      for (const line of lines)
        await processLine(line)
    })
  })

  speedtest.stderr.on('data', data => (stderr += data.toString()))
  speedtest.on('error', (error) => {
    processError = true
    console.error('Unable to start speedtest:', error)
    if (!clientDisconnected) {
      sendEvent({ type: 'error', message: 'Unable to start the Speedtest CLI.' })
      res.end()
    }
  })
  speedtest.on('close', (code) => {
    outputQueue = outputQueue.then(async () => {
      if (outputBuffer.trim())
        await processLine(outputBuffer)
      if (code !== 0 && !processError && !clientDisconnected) {
        console.error(`Speedtest exited with code ${code}:`, stderr)
        sendEvent({ type: 'error', message: 'Speedtest failed on the selected interface. Try another interface or use the system default.' })
      }
      if (!clientDisconnected)
        res.end()
    })
  })

  res.on('close', () => {
    clientDisconnected = true
    speedtest.kill('SIGTERM')
  })
})
