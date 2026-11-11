<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const UIcon = resolveComponent('UIcon')
const { query, downloadCSV, isDownloading } = useDataTable('speedtest-results', 'speedtest-results.csv')
query.networkInterface = String(useRoute().query.networkInterface || 'all')

const { data: interfaceData } = await useFetch<{ interfaces: string[], hasLegacyResults: boolean }>('/api/speedtest-results/interfaces')
const interfaceFilterItems = computed(() => [
  { label: 'All interfaces', value: 'all' },
  ...(interfaceData.value?.interfaces ?? []).map(name => ({ label: name, value: name })),
  ...(interfaceData.value?.hasLegacyResults
    ? [
        { label: 'Legacy results · unknown interface', value: '__legacy__' },
      ]
    : []),
])

// Override default pagination limit for speedtest results
query.limit = Number(useRoute().query.limit) || 10

const { data } = await useFetch('/api/speedtest-results', {
  query,
})

const columns: TableColumn<any>[] = [
  createIdColumn(),
  createTimestampColumn(),
  {
    accessorKey: 'networkInterface',
    header: 'Interface',
    cell: ({ row }) => row.getValue('networkInterface') || 'Unknown',
  },
  { accessorKey: 'isp', header: 'ISP' },
  { accessorKey: 'ip', header: 'Public IP' },
  {
    accessorKey: 'download',
    header: () => h('div', { class: 'text-right' }, 'Download (Mbps)'),
    cell: ({ row }) =>
      h('div', { class: `text-right font-medium ${DATA_COLORS.download}` }, `${toMbps(row.getValue('download')).toFixed(2)}`),
  },
  {
    accessorKey: 'upload',
    header: () => h('div', { class: 'text-right' }, 'Upload (Mbps)'),
    cell: ({ row }) =>
      h('div', { class: `text-right font-medium ${DATA_COLORS.upload}` }, `${toMbps(row.getValue('upload')).toFixed(2)}`),
  },
  { accessorKey: 'latency', header: 'Latency (ms)' },
  {
    accessorKey: 'url',
    header: 'Details',
    cell: ({ row }) =>
      h('a', {
        href: row.getValue('url'),
        target: '_blank',
      }, h(UIcon, { name: 'i-lucide-external-link', class: 'text-primary' })),
  },
]
</script>

<template>
  <div class="space-y-6">
    <CommonPageHeader title="Speedtest Results Log">
      <template #actions>
        <CommonResultsFilters
          v-model:start="query.start"
          v-model:end="query.end"
          :is-downloading="isDownloading"
          @download="downloadCSV"
        >
          <template #filter>
            <USelect v-model="query.networkInterface" :items="interfaceFilterItems" class="w-full sm:w-48" aria-label="Filter by network interface" />
          </template>
        </CommonResultsFilters>
      </template>
    </CommonPageHeader>

    <SpeedtestChart :start="query.start" :end="query.end" :network-interface="query.networkInterface" />

    <div class="max-w-full overflow-x-auto">
      <u-table
        :data="data?.data"
        :columns="columns"
        class="min-w-[800px]"
        :class="TABLE_CLASSES"
      />
    </div>

    <div class="flex flex-col items-center justify-between gap-3 text-sm text-muted sm:flex-row">
      <div>Total: {{ data?.total?.toLocaleString() ?? 0 }}</div>
      <u-pagination
        v-model:page="query.page"
        :total="data?.total ?? 0"
        :page-size="query.limit"
        size="sm"
      />
    </div>
  </div>
</template>
