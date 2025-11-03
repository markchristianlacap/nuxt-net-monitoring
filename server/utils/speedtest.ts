import type { SpeedtestResult, SpeedtestServer } from '#shared/types/speedtest-server'
import { spawn } from 'node:child_process'

export async function getSpeedtestServers(): Promise<SpeedtestServer[]> {
  const process = spawn('speedtest', ['-f', 'json', '--accept-license', '-L'])
  return new Promise<SpeedtestServer[]>((resolve, reject) => {
    process.stdout.on('data', (data) => {
      try {
        resolve(JSON.parse(data.toString()) as SpeedtestServer[])
      }
      catch (err) {
        reject(err)
      }
    })
    process.stderr.on('data', (data) => {
      reject(new Error(data.toString()))
    })
  })
}
export async function runSpeedtest(): Promise<SpeedtestResult> {
  const process = spawn('speedtest', ['-f', 'json', '--accept-license'])
  return new Promise<SpeedtestResult>((resolve, reject) => {
    process.stdout.on('data', (data) => {
      try {
        resolve(JSON.parse(data.toString()) as SpeedtestResult)
      }
      catch (err) {
        reject(err)
      }
    })
    process.stderr.on('data', (data) => {
      reject(new Error(data.toString()))
    })
  })
}
