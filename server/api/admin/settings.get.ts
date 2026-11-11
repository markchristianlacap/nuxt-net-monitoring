import { getAppSettings } from '../../utils/app-settings'

export default defineEventHandler(async () => {
  const settings = await getAppSettings()
  return {
    settings: {
      ...settings,
      snmp: {
        devices: settings.snmp.devices.map(device => ({
          ...device,
          community: '',
          communityConfigured: !!device.community,
        })),
      },
    },
  }
})
