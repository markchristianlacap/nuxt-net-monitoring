import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

export interface NetworkConfig {
  snmp: {
    host: string
    community: string
    interfaces: string[]
  }
  ping: {
    hosts: string[]
  }
  speedtest: {
    frequencySeconds: number
  }
}

let networkConfig: NetworkConfig | undefined

export function getNetworkConfig(): NetworkConfig {
  if (networkConfig)
    return networkConfig

  const configPath = resolve(process.cwd(), 'network.config.json')
  let parsed: unknown

  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf8'))
  }
  catch (error) {
    throw new Error(`Unable to load ${configPath}. Copy network.config.example.json to network.config.json and configure it.`, { cause: error })
  }

  if (!parsed || typeof parsed !== 'object')
    throw new TypeError(`${configPath} must contain a JSON object`)

  const config = parsed as Partial<NetworkConfig>
  if (
    !config.snmp
    || typeof config.snmp.host !== 'string'
    || typeof config.snmp.community !== 'string'
    || !Array.isArray(config.snmp.interfaces)
    || !config.snmp.interfaces.every(value => typeof value === 'string')
    || !config.ping
    || !Array.isArray(config.ping.hosts)
    || !config.ping.hosts.every(value => typeof value === 'string')
    || !config.speedtest
    || typeof config.speedtest.frequencySeconds !== 'number'
    || !Number.isFinite(config.speedtest.frequencySeconds)
    || config.speedtest.frequencySeconds <= 0
  ) {
    throw new TypeError(`${configPath} has an invalid structure; see network.config.example.json`)
  }

  networkConfig = config as NetworkConfig
  return networkConfig
}
