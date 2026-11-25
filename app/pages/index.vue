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
    <header class="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
          Good morning, team
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Keep an eye on your network health and internet performance from one place.
        </p>
      </div>
      <div class="flex items-center gap-2 text-xs text-muted">
        <span class="size-2 rounded-full bg-success" />
        Live monitoring active
      </div>
    </header>

    <div class="grid gap-4 sm:grid-cols-3">
      <UCard :ui="{ body: 'p-4 sm:p-5' }" class="border-default/80 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">
              Monitoring status
            </p>
            <p class="mt-2 text-xl font-bold tracking-tight text-highlighted">
              Operational
            </p>
          </div>
          <span class="grid size-9 place-items-center rounded-lg bg-success/10 text-success"><UIcon name="i-lucide-shield-check" class="size-5" /></span>
        </div>
        <p class="mt-3 text-xs text-muted">
          Data is arriving in real time
        </p>
      </UCard>
      <UCard :ui="{ body: 'p-4 sm:p-5' }" class="border-default/80 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">
              Data sources
            </p>
            <p class="mt-2 text-xl font-bold tracking-tight text-highlighted">
              {{ tabs.length }} active
            </p>
          </div>
          <span class="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-database-zap" class="size-5" /></span>
        </div>
        <p class="mt-3 text-xs text-muted">
          Bandwidth and speed insights
        </p>
      </UCard>
      <UCard :ui="{ body: 'p-4 sm:p-5' }" class="border-default/80 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">
              Last refreshed
            </p>
            <p class="mt-2 text-xl font-bold tracking-tight text-highlighted">
              Just now
            </p>
          </div>
          <span class="grid size-9 place-items-center rounded-lg bg-secondary/10 text-secondary"><UIcon name="i-lucide-refresh-cw" class="size-5" /></span>
        </div>
        <p class="mt-3 text-xs text-muted">
          Live stream connected
        </p>
      </UCard>
    </div>

    <div v-if="tabs.length > 1" class="flex justify-start">
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
      <BandwidthStream v-if="tab === 'bandwidths' && data?.features.bandwidth" />
      <SpeedtestPanel v-if="tab === 'speedtest' && data?.features.speedtest" />
      <UCard v-if="!tabs.length" class="text-center">
        <p>No monitoring features are enabled.</p>
        <UButton class="mt-4" to="/admin">
          Configure monitoring
        </UButton>
      </UCard>
    </div>
  </div>
</template>
