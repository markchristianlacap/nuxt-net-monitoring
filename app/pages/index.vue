<script setup lang="ts">
const tab = ref<'pings' | 'bandwidths'>('pings')
const { data } = await useFetch<{ features: { ping: boolean, bandwidth: boolean } }>('/api/features')
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
])

watch(tabs, (availableTabs) => {
  if (!availableTabs.some(item => item.value === tab.value))
    tab.value = availableTabs[0]?.value ?? 'pings'
}, { immediate: true })
</script>

<template>
  <div>
    <div v-if="tabs.length > 1" class="flex justify-center">
      <u-radio-group
        v-model="tab"
        variant="table"
        orientation="horizontal"
        :items="tabs"
        label-key="label"
        value-key="value"
      />
    </div>
    <div class="mt-4">
      <PingStream v-if="tab === 'pings' && data?.features.ping" />
      <BandwidthStream v-if="tab === 'bandwidths' && data?.features.bandwidth" />
      <UCard v-if="!tabs.length" class="text-center">
        <p>No monitoring features are enabled yet.</p>
        <UButton class="mt-4" to="/admin">
          Configure monitoring
        </UButton>
      </UCard>
    </div>
  </div>
</template>
