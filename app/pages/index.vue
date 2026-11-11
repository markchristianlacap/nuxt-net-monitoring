<script setup lang="ts">
const route = useRoute()
const tab = ref<'pings' | 'bandwidths' | 'speedtest'>(
  route.query.tab === 'speedtest'
    ? 'speedtest'
    : 'pings',
)
const { data } = await useFetch<{ features: { ping: boolean, bandwidth: boolean, speedtest: boolean } }>('/api/features')
const tabs = computed(() => [
  ...(data.value?.features.ping
    ? [
        { label: 'Ping Latency', value: 'pings' as const },
      ]
    : []),
  ...(data.value?.features.bandwidth
    ? [
        { label: 'Bandwidth', value: 'bandwidths' as const },
      ]
    : []),
  ...(data.value?.features.speedtest
    ? [
        { label: 'Speedtest', value: 'speedtest' as const },
      ]
    : []),
])

watch(tabs, (availableTabs) => {
  if (!availableTabs.some(item => item.value === tab.value))
    tab.value = availableTabs[0]?.value ?? 'pings'
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div v-if="tabs.length > 1" class="flex justify-center sm:justify-start">
      <u-radio-group
        v-model="tab"
        variant="table"
        orientation="horizontal"
        :items="tabs"
        label-key="label"
        value-key="value"
      />
    </div>
    <div>
      <PingStream v-if="tab === 'pings' && data?.features.ping" />
      <BandwidthStream v-if="tab === 'bandwidths' && data?.features.bandwidth" />
      <div v-if="tab === 'speedtest' && data?.features.speedtest" class="space-y-4">
        <SpeedtestScheduleStatus />
        <ManualSpeedtest />
      </div>
      <UCard v-if="!tabs.length" class="text-center">
        <p>No monitoring features are enabled.</p>
        <UButton class="mt-4" to="/admin">
          Configure monitoring
        </UButton>
      </UCard>
    </div>
  </div>
</template>
