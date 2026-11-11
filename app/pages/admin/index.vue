<script setup lang="ts">
import type { AppSettings } from '~~/shared/types/settings'
import { SYSTEM_DEFAULT_INTERFACE_VALUE } from '~~/shared/types/settings'

definePageMeta({ middleware: 'auth' })

interface AdminSettings extends AppSettings {
  snmp: {
    devices: Array<AppSettings['snmp']['devices'][number] & { communityConfigured?: boolean }>
  }
}

const pending = ref(false)
const errorMessage = ref('')
const { data } = await useFetch<{ settings: AdminSettings }>('/api/admin/settings')
const { data: speedtestInterfaces } = await useFetch<Array<{ name: string, addresses: string[] }>>('/api/admin/speedtest-interfaces')
const settings = reactive<AppSettings>(data.value?.settings ?? {
  features: { ping: false, bandwidth: false, speedtest: false },
  ping: { hosts: [] },
  snmp: { devices: [] },
  speedtest: { frequencySeconds: 3600, localInterfaceName: null },
})
const pingHostsText = ref(settings.ping.hosts.join('\n'))
const scheduledInterface = ref(settings.speedtest.localInterfaceName ?? SYSTEM_DEFAULT_INTERFACE_VALUE)
const scheduledInterfaceItems = computed(() => [
  { label: 'System default', value: SYSTEM_DEFAULT_INTERFACE_VALUE },
  ...(speedtestInterfaces.value ?? []).map(item => ({
    label: `${item.name} · ${item.addresses.join(', ')}`,
    value: item.name,
  })),
  ...(scheduledInterface.value !== SYSTEM_DEFAULT_INTERFACE_VALUE
    && !speedtestInterfaces.value?.some(item => item.name === scheduledInterface.value)
    ? [
        { label: `${scheduledInterface.value} · unavailable`, value: scheduledInterface.value },
      ]
    : []),
])
const devices = ref((data.value?.settings.snmp.devices ?? []).map(device => ({
  ...device,
  interfacesText: device.interfaces?.join(', ') ?? '',
  communityConfigured: device.communityConfigured ?? false,
})))

function addDevice() {
  devices.value.push({
    host: '',
    community: '',
    displayName: '',
    interfaces: [],
    interfacesText: '',
    communityConfigured: false,
  })
}

function removeDevice(index: number) {
  devices.value.splice(index, 1)
}

async function saveSettings() {
  errorMessage.value = ''
  pending.value = true
  try {
    await $fetch('/api/admin/settings', {
      method: 'PUT',
      body: {
        settings: {
          ...settings,
          speedtest: {
            ...settings.speedtest,
            localInterfaceName: scheduledInterface.value === SYSTEM_DEFAULT_INTERFACE_VALUE
              ? null
              : scheduledInterface.value,
          },
          ping: {
            hosts: pingHostsText.value.split('\n'),
          },
          snmp: {
            devices: devices.value.map(device => ({
              host: device.host,
              community: device.community,
              displayName: device.displayName,
              interfaces: device.interfacesText.split(',').map(value => value.trim()).filter(Boolean),
            })),
          },
        },
      },
    })
    await refreshNuxtData('app-features')
    await navigateTo('/')
  }
  catch (error: any) {
    errorMessage.value = error.data?.statusMessage ?? 'Unable to save settings.'
  }
  finally {
    pending.value = false
  }
}

async function signOut() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-8 pb-12">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold">
          Monitoring settings
        </h1>
        <p class="mt-2 text-muted">
          Choose which monitoring features run and configure their sources.
        </p>
      </div>
      <UButton variant="outline" @click="signOut">
        Sign out
      </UButton>
    </div>

    <form class="space-y-6" @submit.prevent="saveSettings">
      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold">
              Ping monitoring
            </h2>
            <p class="text-sm text-muted">
              Check hosts continuously and save one-minute averages.
            </p>
          </div>
        </template>
        <div class="space-y-4">
          <USwitch v-model="settings.features.ping" label="Enable ping monitoring" />
          <UFormField label="Hosts" help="Enter one hostname or IP address per line.">
            <UTextarea v-model="pingHostsText" :rows="4" class="w-full" placeholder="1.1.1.1&#10;example.com" />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold">
              SNMP bandwidth monitoring
            </h2>
            <p class="text-sm text-muted">
              Collect interface throughput from SNMP-enabled devices.
            </p>
          </div>
        </template>
        <div class="space-y-5">
          <USwitch v-model="settings.features.bandwidth" label="Enable bandwidth monitoring" />
          <div v-for="(device, index) in devices" :key="index" class="space-y-4 rounded-lg border border-default p-4">
            <div class="flex items-center justify-between">
              <h3 class="font-medium">
                Device {{ index + 1 }}
              </h3>
              <UButton type="button" color="error" variant="ghost" @click="removeDevice(index)">
                Remove
              </UButton>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Host">
                <UInput v-model="device.host" placeholder="192.168.1.1" class="w-full" />
              </UFormField>
              <UFormField label="Display name">
                <UInput v-model="device.displayName" placeholder="Main router" class="w-full" />
              </UFormField>
              <UFormField label="SNMP community" :help="device.communityConfigured ? 'Leave blank to keep the current value.' : 'Required to connect to this device.'">
                <UInput v-model="device.community" type="password" autocomplete="new-password" class="w-full" />
              </UFormField>
              <UFormField label="Interfaces" help="Comma-separated; leave blank to monitor all interfaces.">
                <UInput v-model="device.interfacesText" placeholder="wan, lan" class="w-full" />
              </UFormField>
            </div>
          </div>
          <UButton type="button" variant="outline" @click="addDevice">
            Add SNMP device
          </UButton>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold">
              Speed tests
            </h2>
            <p class="text-sm text-muted">
              Run scheduled internet speed tests and save the results.
            </p>
          </div>
        </template>
        <div class="space-y-4">
          <USwitch v-model="settings.features.speedtest" label="Enable scheduled speed tests" />
          <UFormField label="Frequency (seconds)" help="Between 60 seconds and 7 days.">
            <UInput v-model.number="settings.speedtest.frequencySeconds" type="number" min="60" max="604800" class="w-full sm:max-w-xs" />
          </UFormField>
          <UFormField label="Scheduled test interface" help="Choose the local network adapter for scheduled tests.">
            <USelect v-model="scheduledInterface" :items="scheduledInterfaceItems" class="w-full sm:max-w-md" />
          </UFormField>
        </div>
      </UCard>

      <p v-if="errorMessage" class="text-sm text-error" role="alert">
        {{ errorMessage }}
      </p>
      <UButton type="submit" :loading="pending">
        Save settings
      </UButton>
    </form>
  </div>
</template>
