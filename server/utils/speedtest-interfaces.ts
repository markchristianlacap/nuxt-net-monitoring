import { networkInterfaces } from 'node:os'

export interface SpeedtestNetworkInterface {
  name: string
  addresses: string[]
}

export function getAvailableSpeedtestInterfaces(): SpeedtestNetworkInterface[] {
  return Object.entries(networkInterfaces())
    .map(([name, addresses]) => ({
      name,
      addresses: [
        ...new Set((addresses ?? []).filter(address => !address.internal).map(address => address.address)),
      ],
    }))
    .filter(networkInterface => networkInterface.addresses.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function validateSpeedtestInterface(value: unknown): string | null {
  if (value === undefined || value === null || value === '')
    return null
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Network interface must be a string' })
  }

  const interfaceName = value.trim()
  if (!interfaceName)
    return null
  if (!getAvailableSpeedtestInterfaces().some(networkInterface => networkInterface.name === interfaceName)) {
    throw createError({ statusCode: 400, statusMessage: 'Selected network interface is not available to the application' })
  }
  return interfaceName
}
