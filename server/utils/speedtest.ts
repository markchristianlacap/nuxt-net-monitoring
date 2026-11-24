import { spawn } from 'node:child_process'
import { toMbps } from '../../shared/utils/converter'
import { db } from '../db'
import { speedtestResults } from '../db/schema/speedtest-results'
import { getSpeedtestInterfaceIpAddress } from './speedtest-interfaces'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const SPEEDTEST_RATE_LIMIT_PATTERN = /limit reached|too many requests received/i

const emptyProgress: SpeedtestProgress = {
  phase: 'starting',
  progress: 0,
  downloadMbps: null,
  uploadMbps: null,
  latencyMs: null,
  isp: null,
  publicIp: null,
  resultUrl: null,
  errorMessage: null,
}

let status: SpeedtestStatus = {
  enabled: false,
  running: false,
  source: null,
  interfaces: [],
  currentInterface: null,
  currentIndex: null,
  currentTest: null,
  frequencySeconds: null,
  nextRunAt: null,
  lastAttempt: null,
}

const statusListeners = new Set<(status: SpeedtestStatus) => void>()

function publishStatus() {
  const snapshot = getSpeedtestStatus()
  for (const listener of statusListeners) {
    try {
      listener(snapshot)
    }
    catch (error) {
      console.error('Unable to publish speedtest status:', error)
    }
  }
}

export function getSpeedtestStatus(): SpeedtestStatus {
  return structuredClone(status)
}

export function updateSpeedtestStatus(update: Partial<SpeedtestStatus>) {
  status = {
    ...status,
    ...update,
  }
  publishStatus()
}

export function subscribeToSpeedtestStatus(listener: (status: SpeedtestStatus) => void) {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

function progressFromEvent(current: SpeedtestProgress, event: SpeedtestEvent): SpeedtestProgress {
  const progress = { ...current, errorMessage: null }

  switch (event.type) {
    case 'testStart':
      return {
        ...emptyProgress,
        phase: 'ping',
        isp: event.isp ?? null,
        publicIp: event.interface?.externalIp ?? null,
      }
    case 'ping':
      progress.phase = 'ping'
      progress.progress = event.ping?.progress ?? progress.progress
      progress.latencyMs = event.ping?.latency ?? progress.latencyMs
      break
    case 'download':
      progress.phase = 'download'
      progress.progress = event.download?.progress ?? progress.progress
      if (event.download?.bandwidth !== undefined)
        progress.downloadMbps = toMbps(event.download.bandwidth)
      break
    case 'upload':
      progress.phase = 'upload'
      progress.progress = event.upload?.progress ?? progress.progress
      if (event.upload?.bandwidth !== undefined)
        progress.uploadMbps = toMbps(event.upload.bandwidth)
      break
    case 'result':
      progress.phase = 'complete'
      progress.progress = 1
      progress.latencyMs = event.ping?.latency ?? progress.latencyMs
      if (event.download?.bandwidth !== undefined)
        progress.downloadMbps = toMbps(event.download.bandwidth)
      if (event.upload?.bandwidth !== undefined)
        progress.uploadMbps = toMbps(event.upload.bandwidth)
      progress.isp = event.isp ?? progress.isp
      progress.publicIp = event.interface?.externalIp ?? progress.publicIp
      progress.resultUrl = event.result?.url ?? progress.resultUrl
      break
  }

  return progress
}

async function runSingleSpeedtest(interfaceName: string | null, source: 'manual' | 'scheduled', index: number | null) {
  updateSpeedtestStatus({
    source,
    currentInterface: interfaceName || 'System default',
    currentIndex: index,
    currentTest: { ...emptyProgress },
  })

  try {
    const result = await executeSpeedtest(interfaceName, (event) => {
      const progress = progressFromEvent(status.currentTest ?? { ...emptyProgress }, event)
      updateSpeedtestStatus({
        currentInterface: event.interface?.name || status.currentInterface,
        currentTest: progress,
      })
    })

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

    updateSpeedtestStatus({
      currentInterface: interfaceName || result.interface.name || 'System default',
      currentTest: {
        ...(status.currentTest ?? { ...emptyProgress }),
        phase: 'complete',
        progress: 1,
        errorMessage: null,
      },
      lastAttempt: {
        interfaceName: interfaceName || result.interface.name || 'System default',
        completedAt: new Date().toISOString(),
        status: 'success',
      },
    })
  }
  catch (error) {
    const output = error instanceof Error
      ? error.message
      : String(error)
    const message = SPEEDTEST_RATE_LIMIT_PATTERN.test(output)
      ? 'Ookla has temporarily rate-limited the Speedtest CLI. Wait before trying again; changing the network interface will not resolve this limit.'
      : `Speedtest failed using the ${interfaceName
        ? `interface “${interfaceName}”`
        : 'system default interface'}: ${output.split(/\r?\n/).filter(Boolean).slice(-4).join(' ').slice(0, 400) || 'Check the Speedtest CLI and network connection.'}`

    console.error(`${source === 'scheduled'
      ? 'Scheduled'
      : 'Manual'} speed test failed for ${interfaceName ?? 'system default'}:`, error)
    updateSpeedtestStatus({
      currentTest: {
        ...(status.currentTest ?? { ...emptyProgress }),
        phase: 'error',
        errorMessage: message,
      },
      lastAttempt: {
        interfaceName: interfaceName ?? 'System default',
        completedAt: new Date().toISOString(),
        status: 'failed',
      },
    })
  }
}

export function startManualSpeedtest(interfaceName: string | null): boolean {
  if (status.running)
    return false

  updateSpeedtestStatus({
    running: true,
    source: 'manual',
    currentIndex: null,
    nextRunAt: status.nextRunAt,
  })

  void runSingleSpeedtest(interfaceName, 'manual', null)
    .finally(() => updateSpeedtestStatus({ running: false }))

  return true
}

export async function runScheduledSpeedtests(
  interfaceNames: Array<string | null>,
  shouldContinue: () => boolean,
): Promise<boolean> {
  if (status.running)
    return false

  const selectedInterfaces = interfaceNames.length > 0
    ? interfaceNames
    : [null]
  updateSpeedtestStatus({
    running: true,
    source: 'scheduled',
    currentInterface: null,
    currentIndex: null,
    currentTest: null,
    nextRunAt: null,
  })

  try {
    for (const [index, interfaceName] of selectedInterfaces.entries()) {
      if (!shouldContinue())
        break
      await runSingleSpeedtest(interfaceName, 'scheduled', index + 1)
    }
  }
  finally {
    updateSpeedtestStatus({ running: false, currentIndex: null })
  }

  return true
}

class SpeedtestRateLimitError extends Error {
  constructor() {
    super('Ookla rate-limited the Speedtest server lookup. Wait before trying again. The Speedtest CLI is limited to personal, non-commercial use on one computer; commercial use requires an appropriate license: https://www.ookla.com/speedtest-embedded.')
    this.name = 'SpeedtestRateLimitError'
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function retry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    }
    catch (err) {
      if (err instanceof SpeedtestRateLimitError)
        throw err
      if (attempt < retries - 1) {
        await delay(RETRY_DELAY_MS * 2 ** attempt)
      }
      else {
        throw err
      }
    }
  }
  // This should never be reached, but TypeScript requires it
  throw new Error('Max retries exceeded')
}

export async function getSpeedtestServers(): Promise<SpeedtestServer[]> {
  return retry(() => new Promise((resolve, reject) => {
    const process = spawn('speedtest', ['-f', 'json', '--accept-license', '-L'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    })
    let output = ''
    let stderr = ''

    process.stdout.on('data', data => (output += data.toString()))
    process.stderr.on('data', data => (stderr += data.toString()))
    process.once('error', reject)

    process.on('close', (code) => {
      const commandOutput = [output, stderr].filter(Boolean).join('\n').trim()
      if (SPEEDTEST_RATE_LIMIT_PATTERN.test(commandOutput))
        return reject(new SpeedtestRateLimitError())
      if (code !== 0 || stderr)
        return reject(new Error(stderr || `Exited with code ${code}`))
      if (!output.trim())
        return reject(new Error('No output from speedtest'))
      try {
        resolve(JSON.parse(output) as SpeedtestServer[])
      }
      catch (err) {
        reject(err)
      }
    })
  }))
}

async function executeSpeedtest(
  interfaceName: string | null = null,
  onEvent?: (event: SpeedtestEvent) => void,
): Promise<SpeedtestResult> {
  const interfaceIpAddress = getSpeedtestInterfaceIpAddress(interfaceName)
  const interfaceArgs = interfaceIpAddress
    ? ['-i', interfaceIpAddress]
    : []

  return retry(() => new Promise((resolve, reject) => {
    const process = spawn('speedtest', [
      ...interfaceArgs,
      '-f',
      'jsonl',
      '--accept-license',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    })
    let outputBuffer = ''
    let stderr = ''
    let result: SpeedtestResult | undefined
    let parseError: unknown

    process.once('error', reject)

    const processLine = (line: string) => {
      if (!line.trim())
        return

      try {
        const event = JSON.parse(line) as SpeedtestEvent
        onEvent?.(event)
        if (event.type === 'result')
          result = event as SpeedtestResult
      }
      catch (error) {
        parseError = error
      }
    }

    process.stdout.on('data', (data) => {
      outputBuffer += data.toString()
      const lines = outputBuffer.split(/\r?\n/)
      outputBuffer = lines.pop() ?? ''
      for (const line of lines)
        processLine(line)
    })
    process.stderr.on('data', data => (stderr += data.toString()))

    process.on('close', (code) => {
      processLine(outputBuffer)
      if (parseError)
        return reject(parseError)
      if (code !== 0 || stderr)
        return reject(new Error(stderr || `Exited with code ${code}`))
      if (!result)
        return reject(new Error('No result found'))
      resolve(result)
    })
  }))
}
