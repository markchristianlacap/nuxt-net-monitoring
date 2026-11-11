import { eq } from 'drizzle-orm'
import { MIN_SPEEDTEST_FREQUENCY_SECONDS } from '../../shared/types/settings'
import { db } from '../db'
import { appSettings as appSettingsTable } from '../db/schema/app-settings'

type SettingsListener = (settings: AppSettings) => void | Promise<void>

const listeners = new Set<SettingsListener>()
let settingsCache: AppSettings | undefined

export function subscribeToAppSettings(listener: SettingsListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function notifyAppSettingsChanged(settings: AppSettings) {
  await Promise.all([...listeners].map(async (listener) => {
    try {
      await listener(settings)
    }
    catch (error) {
      console.error('Unable to apply updated application settings:', error)
    }
  }))
}

export async function getAppSettings(): Promise<AppSettings> {
  if (settingsCache)
    return structuredClone(settingsCache)

  await db.insert(appSettingsTable)
    .values({
      id: 1,
      settings: structuredClone(DEFAULT_APP_SETTINGS),
    })
    .onConflictDoNothing()

  const [row] = await db.select({ settings: appSettingsTable.settings })
    .from(appSettingsTable)
    .where(eq(appSettingsTable.id, 1))
    .limit(1)

  const storedSettings = row?.settings ?? DEFAULT_APP_SETTINGS
  const storedSpeedtest = (storedSettings.speedtest ?? {}) as AppSettings['speedtest'] & {
    localInterfaceName?: unknown
  }
  const {
    localInterfaceName: legacyLocalInterfaceName,
    ...storedSpeedtestConfig
  } = storedSpeedtest
  let localInterfaceNames: string[]
  if (Array.isArray(storedSpeedtestConfig.localInterfaceNames)) {
    localInterfaceNames = storedSpeedtestConfig.localInterfaceNames
  }
  else if (typeof legacyLocalInterfaceName === 'string' && legacyLocalInterfaceName.trim()) {
    localInterfaceNames = [
      legacyLocalInterfaceName.trim(),
    ]
  }
  else {
    localInterfaceNames = []
  }
  const storedFrequencySeconds = storedSpeedtestConfig.frequencySeconds
  const frequencySeconds = typeof storedFrequencySeconds === 'number' && Number.isInteger(storedFrequencySeconds)
    ? Math.max(MIN_SPEEDTEST_FREQUENCY_SECONDS, storedFrequencySeconds)
    : DEFAULT_APP_SETTINGS.speedtest.frequencySeconds
  settingsCache = {
    ...structuredClone(DEFAULT_APP_SETTINGS),
    ...storedSettings,
    features: {
      ...DEFAULT_APP_SETTINGS.features,
      ...storedSettings.features,
    },
    ping: {
      ...DEFAULT_APP_SETTINGS.ping,
      ...storedSettings.ping,
    },
    snmp: {
      ...DEFAULT_APP_SETTINGS.snmp,
      ...storedSettings.snmp,
    },
    speedtest: {
      ...DEFAULT_APP_SETTINGS.speedtest,
      ...storedSpeedtestConfig,
      frequencySeconds,
      localInterfaceNames,
    },
  }
  return structuredClone(settingsCache)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function validateStringArray(value: unknown, label: string, maxLength: number): string[] {
  if (!Array.isArray(value) || value.length > maxLength || !value.every(item => typeof item === 'string')) {
    throw createError({ statusCode: 400, statusMessage: `${label} must be a list of at most ${maxLength} strings` })
  }
  return [
    ...new Set(value.map(item => item.trim()).filter(Boolean)),
  ]
}

export function normalizeAppSettings(input: unknown, previous: AppSettings): AppSettings {
  if (!isRecord(input) || !isRecord(input.features) || !isRecord(input.ping) || !isRecord(input.snmp) || !isRecord(input.speedtest)) {
    throw createError({ statusCode: 400, statusMessage: 'Settings have an invalid structure' })
  }

  const features = input.features
  if (![features.ping, features.bandwidth, features.speedtest].every(value => typeof value === 'boolean')) {
    throw createError({ statusCode: 400, statusMessage: 'Feature enabled values must be true or false' })
  }

  const pingHosts = validateStringArray(input.ping.hosts, 'Ping hosts', 128)
  if (pingHosts.some(host => host.length > 253 || /\s/.test(host))) {
    throw createError({ statusCode: 400, statusMessage: 'Ping hosts must be valid hostnames or IP addresses' })
  }

  if (!Array.isArray(input.snmp.devices) || input.snmp.devices.length > 32) {
    throw createError({ statusCode: 400, statusMessage: 'SNMP devices must be a list of at most 32 devices' })
  }
  const oldDevices = new Map(previous.snmp.devices.map(device => [
    device.host.trim().toLowerCase(),
    device,
  ]))
  const devices: SnmpDeviceConfig[] = input.snmp.devices.map((value, index) => {
    if (!isRecord(value) || typeof value.host !== 'string' || typeof value.community !== 'string') {
      throw createError({ statusCode: 400, statusMessage: `SNMP device ${index + 1} is invalid` })
    }

    const host = value.host.trim()
    const community = value.community.trim()
      || oldDevices.get(host.toLowerCase())?.community
      || ''
    const displayName = typeof value.displayName === 'string'
      ? value.displayName.trim()
      : ''
    const interfaces = value.interfaces === undefined
      ? []
      : validateStringArray(value.interfaces, `SNMP device ${index + 1} interfaces`, 256)

    if (!host || host.length > 253 || /\s/.test(host)) {
      throw createError({ statusCode: 400, statusMessage: `SNMP device ${index + 1} needs a valid host` })
    }
    if (community.length > 255 || displayName.length > 255 || interfaces.some(iface => iface.length > 255)) {
      throw createError({ statusCode: 400, statusMessage: `SNMP device ${index + 1} has a value that is too long` })
    }
    return {
      host,
      community,
      ...(displayName
        ? { displayName }
        : {}),
      interfaces,
    }
  })

  if (new Set(devices.map(device => device.host.toLowerCase())).size !== devices.length) {
    throw createError({ statusCode: 400, statusMessage: 'SNMP device hosts must be unique' })
  }

  const frequencySeconds = input.speedtest.frequencySeconds
  const legacyLocalInterfaceName = input.speedtest.localInterfaceName
  let localInterfaceNames: string[]
  if (input.speedtest.localInterfaceNames !== undefined) {
    localInterfaceNames = validateStringArray(input.speedtest.localInterfaceNames, 'Scheduled speed-test interfaces', 32)
  }
  else if (legacyLocalInterfaceName === undefined || legacyLocalInterfaceName === null) {
    localInterfaceNames = []
  }
  else if (typeof legacyLocalInterfaceName === 'string') {
    localInterfaceNames = validateStringArray([legacyLocalInterfaceName], 'Scheduled speed-test interfaces', 32)
  }
  else {
    throw createError({ statusCode: 400, statusMessage: 'Scheduled speed-test interfaces must be valid interface names' })
  }
  if (localInterfaceNames.some(interfaceName => interfaceName.length > 255)) {
    throw createError({ statusCode: 400, statusMessage: 'Scheduled speed-test interface names must be at most 255 characters' })
  }
  if (typeof frequencySeconds !== 'number' || !Number.isInteger(frequencySeconds) || frequencySeconds < MIN_SPEEDTEST_FREQUENCY_SECONDS || frequencySeconds > 604800) {
    throw createError({ statusCode: 400, statusMessage: 'Speed-test frequency must be between 3600 and 604800 seconds' })
  }
  if (features.ping && pingHosts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Add at least one ping host or disable ping monitoring' })
  }
  if (features.bandwidth && (devices.length === 0 || devices.some(device => !device.community))) {
    throw createError({ statusCode: 400, statusMessage: 'Add an SNMP device with a community string or disable bandwidth monitoring' })
  }

  return {
    features: {
      ping: features.ping as boolean,
      bandwidth: features.bandwidth as boolean,
      speedtest: features.speedtest as boolean,
    },
    ping: { hosts: pingHosts },
    snmp: { devices },
    speedtest: {
      frequencySeconds,
      localInterfaceNames,
    },
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<AppSettings> {
  await db.insert(appSettingsTable)
    .values({
      id: 1,
      settings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettingsTable.id,
      set: {
        settings,
        updatedAt: new Date(),
      },
    })
  settingsCache = structuredClone(settings)
  await notifyAppSettingsChanged(settings)
  return settings
}
