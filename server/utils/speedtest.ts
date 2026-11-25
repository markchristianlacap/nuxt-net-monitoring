import { spawn } from 'node:child_process'
import { db } from '../db'
import { speedtestResults } from '../db/schema/speedtest-results'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const SPEEDTEST_RATE_LIMIT_PATTERN = /limit reached|too many requests received/i

class SpeedtestCancelledError extends Error {
  constructor() {
    super('Speedtest was cancelled')
    this.name = 'SpeedtestCancelledError'
  }
}

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
let manualAbortController: AbortController | null = null
let manualRunPromise: Promise<void> | null = null

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

async function runSingleSpeedtest(
  interfaceName: string | null,
  source: 'manual' | 'scheduled',
  index: number | null,
  signal?: AbortSignal,
) {
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
    }, signal)

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
    if (error instanceof SpeedtestCancelledError) {
      updateSpeedtestStatus({
        currentTest: {
          ...(status.currentTest ?? { ...emptyProgress }),
          phase: 'cancelled',
          errorMessage: null,
        },
        lastAttempt: {
          interfaceName: status.currentInterface || interfaceName || 'System default',
          completedAt: new Date().toISOString(),
          status: 'cancelled',
        },
      })
      return
    }

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

  const abortController = new AbortController()
  manualAbortController = abortController
  updateSpeedtestStatus({
    running: true,
    source: 'manual',
    currentIndex: null,
    nextRunAt: status.nextRunAt,
  })

  manualRunPromise = runSingleSpeedtest(interfaceName, 'manual', null, abortController.signal)
    .finally(() => {
      manualAbortController = null
      manualRunPromise = null
      updateSpeedtestStatus({ running: false })
    })

  return true
}

export async function stopManualSpeedtest(): Promise<boolean> {
  if (
    status.source !== 'manual'
    || !status.running
    || status.currentTest?.phase === 'complete'
    || !manualAbortController
    || !manualRunPromise
  ) {
    return false
  }

  manualAbortController.abort()
  await manualRunPromise
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

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted)
      return reject(new SpeedtestCancelledError())

    let timeout: ReturnType<typeof setTimeout>
    const onAbort = () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      reject(new SpeedtestCancelledError())
    }
    timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function retry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, signal?: AbortSignal): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (signal?.aborted)
      throw new SpeedtestCancelledError()

    try {
      return await fn()
    }
    catch (err) {
      if (err instanceof SpeedtestRateLimitError)
        throw err
      if (err instanceof SpeedtestCancelledError || signal?.aborted)
        throw new SpeedtestCancelledError()
      if (attempt < retries - 1) {
        await delay(RETRY_DELAY_MS * 2 ** attempt, signal)
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
  signal?: AbortSignal,
): Promise<SpeedtestResult> {
  const interfaceArgs = interfaceName
    ? ['-I', interfaceName]
    : []

  return retry(() => new Promise((resolve, reject) => {
    if (signal?.aborted)
      return reject(new SpeedtestCancelledError())

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
    let forceKillTimeout: ReturnType<typeof setTimeout> | undefined
    let terminationRequested = false

    const terminate = () => {
      if (terminationRequested || process.exitCode !== null || process.signalCode !== null)
        return

      terminationRequested = true
      process.kill('SIGTERM')
      forceKillTimeout = setTimeout(() => {
        if (process.exitCode === null && process.signalCode === null)
          process.kill('SIGKILL')
      }, 2000)
    }

    const cleanup = () => {
      signal?.removeEventListener('abort', terminate)
      if (forceKillTimeout)
        clearTimeout(forceKillTimeout)
    }

    signal?.addEventListener('abort', terminate, { once: true })
    process.once('error', (error) => {
      cleanup()
      if (signal?.aborted)
        reject(new SpeedtestCancelledError())
      else
        reject(error)
    })

    const processLine = (line: string) => {
      if (!line.trim())
        return

      try {
        const event = JSON.parse(line) as SpeedtestEvent
        onEvent?.(event)
        if (event.type === 'result') {
          result = event as SpeedtestResult
          terminate()
        }
      }
      catch (error) {
        if (!result)
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
      cleanup()
      processLine(outputBuffer)
      if (signal?.aborted && !result)
        return reject(new SpeedtestCancelledError())
      if (parseError)
        return reject(parseError)
      if (!result) {
        if (code !== 0 || stderr)
          return reject(new Error(stderr || `Exited with code ${code}`))
        return reject(new Error('No result found'))
      }
      if (code !== 0 && !terminationRequested)
        return reject(new Error(stderr || `Exited with code ${code}`))
      resolve(result)
    })
  }), MAX_RETRIES, signal)
}
