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
    localInterfaceName: string | null
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
    frequencySeconds: 3600,
    localInterfaceName: null,
  },
}
