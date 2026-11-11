export const SYSTEM_DEFAULT_INTERFACE_VALUE = '__system_default__'
export const MIN_SPEEDTEST_FREQUENCY_SECONDS = 3600

export interface SnmpDeviceConfig {
  host: string
  community: string
  displayName?: string
  interfaces?: string[]
}

export interface AppSettings {
  features: {
    ping: boolean
    bandwidth: boolean
    speedtest: boolean
  }
  ping: {
    hosts: string[]
  }
  snmp: {
    devices: SnmpDeviceConfig[]
  }
  speedtest: {
    frequencySeconds: number
    localInterfaceNames: string[]
  }
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  features: {
    ping: false,
    bandwidth: false,
    speedtest: false,
  },
  ping: {
    hosts: [],
  },
  snmp: {
    devices: [],
  },
  speedtest: {
    frequencySeconds: MIN_SPEEDTEST_FREQUENCY_SECONDS,
    localInterfaceNames: [],
  },
}
