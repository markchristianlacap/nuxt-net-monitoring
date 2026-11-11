import { spawn } from 'node:child_process'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function retry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    }
    catch (err) {
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

    process.on('close', (code) => {
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

export async function runSpeedtest(
  interfaceName: string | null = null,
  onEvent?: (event: SpeedtestEvent) => void,
): Promise<SpeedtestResult> {
  return retry(() => new Promise((resolve, reject) => {
    const interfaceArgs = interfaceName
      ? ['--interface', interfaceName]
      : []
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
