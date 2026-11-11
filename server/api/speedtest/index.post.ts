import { spawn } from 'node:child_process'
import { db } from '~~/server/db'
import { speedtestResults } from '~~/server/db/schema/speedtest-results'

interface SpeedtestRequestBody {
  interfaceName?: unknown
}

const RATE_LIMIT_PATTERN = /limit reached|too many requests received/i

function getSpeedtestFailureMessage(interfaceName: string | null, code: number | null, output: string) {
  if (RATE_LIMIT_PATTERN.test(output)) {
    return 'Ookla has temporarily rate-limited the Speedtest CLI. Wait before trying again; changing the network interface will not resolve this limit.'
  }

  const interfaceLabel = interfaceName
    ? `interface “${interfaceName}”`
    : 'system default interface'
  const detail = output
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(-4)
    .join(' ')
    .slice(0, 400)

  return detail
    ? `Speedtest failed using the ${interfaceLabel}: ${detail}`
    : `Speedtest failed using the ${interfaceLabel} (exit code ${code ?? 'unknown'}). Check the Speedtest CLI and network connection.`
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
  let stdoutDiagnostics = ''
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

    let payload: SpeedtestResult
    try {
      payload = JSON.parse(line) as SpeedtestResult
    }
    catch {
      stdoutDiagnostics += `${line}\n`
      return
    }

    try {
      res.write(`id: ${++counter}\n`)
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
      if (payload.type === 'result') {
        const result = payload
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
      const errorCode = (error as NodeJS.ErrnoException).code
      sendEvent({
        type: 'error',
        message: errorCode === 'ENOENT'
          ? 'The Speedtest CLI was not found in the application container.'
          : `The Speedtest CLI could not start: ${error.message}`,
      })
      res.end()
    }
  })
  speedtest.on('close', (code) => {
    outputQueue = outputQueue.then(async () => {
      if (outputBuffer.trim())
        await processLine(outputBuffer)
      if (code !== 0 && !processError && !clientDisconnected) {
        const diagnostics = [stderr, stdoutDiagnostics].filter(Boolean).join('\n').trim()
        console.error(`Speedtest exited with code ${code}:`, diagnostics || 'No CLI diagnostic output')
        sendEvent({
          type: 'error',
          message: getSpeedtestFailureMessage(interfaceName, code, diagnostics),
        })
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
