import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export async function pingHost(host = '8.8.8.8') {
  try {
    const { stdout } = await execAsync(`ping -c 1 ${host}`)
    const match = stdout.match(/time=([\d.]+) ms/)
    const latency = match ? parseFloat(match[1]) : null
    return {
      host,
      status: 'online',
      latency
    }
  } catch {
    return {
      host,
      status: 'offline',
      latency: null
    }
  }
}
