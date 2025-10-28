import type { SpeedtestResult, SpeedtestServer } from '#shared/types/speedtest-server'

export async function getSpeedtestServers(): Promise<SpeedtestServer[]> {
  const res = await execAsync('speedtest -L -f json')
  return JSON.parse(res.stdout) as SpeedtestServer[]
}
export async function runSpeedtest(): Promise<SpeedtestResult> {
  const res = await execAsync('speedtest -f json')
  return JSON.parse(res.stdout) as SpeedtestResult
}
