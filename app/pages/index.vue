<script setup lang="ts">
const route = useRoute()
const tab = ref<'bandwidths' | 'speedtest'>(
  route.query.tab === 'speedtest'
    ? 'speedtest'
    : 'bandwidths',
)
const { data } = await useFetch<{ features: { bandwidth: boolean, speedtest: boolean } }>('/api/features')
const tabs = computed(() => [
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
    tab.value = availableTabs[0]?.value ?? 'bandwidths'
}, { immediate: true })
</script>

<template>
  <div class="space-y-8">
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
    <div class="min-w-0">
      <BandwidthStream v-if="tab === 'bandwidths' && data?.features.bandwidth" />
      <SpeedtestPanel v-if="tab === 'speedtest' && data?.features.speedtest" />
      <UCard v-if="!tabs.length" class="monitor-surface rounded-xl text-center">
        <p>No monitoring features are enabled.</p>
        <UButton class="mt-4" to="/admin">
          Configure monitoring
        </UButton>
      </UCard>
    </div>
  </div>
</template>
