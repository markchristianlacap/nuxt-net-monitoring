<script setup lang="ts">
const route = useRoute()
const tab = ref<'bandwidths' | 'speedtest'>(
  route.query.tab === 'bandwidths'
    ? 'bandwidths'
    : 'speedtest',
)
const { data } = await useFetch<{ features: { bandwidth: boolean, speedtest: boolean } }>('/api/features')
const tabs = computed(() => [
  ...(data.value?.features.speedtest
    ? [
        { label: 'Speedtest', value: 'speedtest' as const },
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
    tab.value = availableTabs[0]?.value ?? 'bandwidths'
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <UPageHeader
      title="Network overview"
      description="A live view of bandwidth, connectivity, and speed-test activity across your infrastructure."
    >
      <template #links>
        <UBadge color="success" variant="subtle" icon="i-lucide-radio-tower">
          Live monitoring
        </UBadge>
      </template>
    </UPageHeader>

    <div v-if="tabs.length > 1" class="flex justify-center my-6">
      <u-radio-group
        v-model="tab"
        variant="table"
        orientation="horizontal"
        :items="tabs"
        label-key="label"
        value-key="value"
        class="justify-center"
      />
    </div>
    <div>
      <BandwidthStream v-if="tab === 'bandwidths' && data?.features.bandwidth" />
      <SpeedtestPanel v-if="tab === 'speedtest' && data?.features.speedtest" />
      <UCard v-if="!tabs.length" class="empty-state text-center">
        <UIcon name="i-lucide-gauge" class="mx-auto mb-3 size-8 text-muted" aria-hidden="true" />
        <h2 class="font-semibold text-highlighted">
          Monitoring is not configured
        </h2>
        <p class="mx-auto mt-1 max-w-md text-sm text-muted">
          Enable a monitoring source to start collecting network telemetry.
        </p>
        <UButton class="mt-4" to="/admin">
          Configure monitoring
        </UButton>
      </UCard>
    </div>
  </div>
</template>
