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
      if (attempt < retries - 1)
        await delay(RETRY_DELAY_MS * 2 ** attempt)
      else
        throw err
    }
  }
  throw new Error('Retry failed')
}

export async function getSpeedtestServers(): Promise<SpeedtestServer[]> {
  return retry(() => new Promise((resolve, reject) => {
    // Use 8 threads for consistent performance in background processes
    const process = spawn('speedtest', ['-f', 'json', '--accept-license', '-L', '--threads=8'])
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

export async function runSpeedtest(): Promise<SpeedtestResult> {
  return retry(() => new Promise((resolve, reject) => {
    // Use 8 threads for consistent performance in background processes
    const process = spawn('speedtest', ['-f', 'jsonl', '--accept-license', '--threads=8'])
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
        const lines = output.trim().split('\n')
        for (const line of lines) {
          const res = JSON.parse(line)
          if (res.type === 'result')
            return resolve(res as SpeedtestResult)
        }
        reject(new Error('No result found'))
      }
      catch (err) {
        reject(err)
      }
    })
  }))
}
