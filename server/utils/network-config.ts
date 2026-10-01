import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

export interface NetworkConfig {
  snmp: {
    devices: SnmpDeviceConfig[]
  }
  ping: {
    hosts: string[]
  }
  speedtest: {
    frequencySeconds: number
  }
}

export interface SnmpDeviceConfig {
  host: string
  community: string
  displayName?: string
  interfaces?: string[]
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
    || !Array.isArray(config.snmp.devices)
    || config.snmp.devices.length === 0
    || !config.snmp.devices.every(device => (
      !!device
      && typeof device.host === 'string'
      && device.host.trim().length > 0
      && typeof device.community === 'string'
      && device.community.trim().length > 0
      && (device.displayName === undefined || typeof device.displayName === 'string')
      && (device.interfaces === undefined || (
        Array.isArray(device.interfaces)
        && device.interfaces.every(value => typeof value === 'string')
      ))
    ))
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

  const hosts = config.snmp.devices.map(device => device.host.trim().toLowerCase())
  if (new Set(hosts).size !== hosts.length)
    throw new TypeError(`${configPath} cannot contain duplicate SNMP device hosts`)

  networkConfig = config as NetworkConfig
  return networkConfig
}
