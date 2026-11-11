<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const { query, downloadCSV, isDownloading } = useDataTable('bandwidths', 'bandwidths.csv')

// Override default pagination limit
query.limit = Number(useRoute().query.limit) || 10

const { data } = await useFetch('/api/bandwidths', {
  query,
})

const columns: TableColumn<any>[] = [
  createIdColumn(),
  createTimestampColumn(),
  {
    accessorKey: 'displayName',
    header: 'Device',
    cell: ({ row }) => row.getValue('displayName') || row.original.host,
  },
  { accessorKey: 'host', header: 'Host' },
  { accessorKey: 'interface', header: 'Interface' },
  {
    accessorKey: 'inMbps',
    header: () => h('div', { class: 'text-right' }, 'Download (Mbps)'),
    cell: ({ row }) =>
      h('div', { class: `text-right font-medium ${DATA_COLORS.in}` }, `${Number(row.getValue('inMbps')).toFixed(2)}`),
  },
  {
    accessorKey: 'outMbps',
    header: () => h('div', { class: 'text-right' }, 'Upload (Mbps)'),
    cell: ({ row }) =>
      h('div', { class: `text-right font-medium ${DATA_COLORS.out}` }, `${Number(row.getValue('outMbps')).toFixed(2)}`),
  },
]
</script>

<template>
  <u-page>
    <div class="container mx-auto mt-3 space-y-4 px-2 text-default sm:mt-6 sm:px-0">
      <div class="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-3">
        <h2 class="text-xl sm:text-2xl font-bold tracking-tight flex-1">
          Bandwidth Monitoring
        </h2>
        <div class="flex gap-2 w-full sm:w-auto">
          <common-date-range v-model:start="query.start" v-model:end="query.end" />
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-download"
            :loading="isDownloading"
            :disabled="isDownloading"
            @click="downloadCSV"
          />
        </div>
      </div>

      <BandwidthChart :start="query.start" :end="query.end" />

      <div class="overflow-x-auto -mx-2 sm:mx-0">
        <u-table
          :data="data?.data"
          :columns="columns"
          class="min-w-[600px]"
          :class="TABLE_CLASSES"
        />
      </div>

      <div class="mt-3 flex flex-col items-center justify-between gap-3 text-xs text-muted sm:flex-row sm:text-sm">
        <div>Total: {{ data?.total?.toLocaleString() ?? 0 }}</div>
        <u-pagination
          v-model:page="query.page"
          :total="data?.total ?? 0"
          :page-size="query.limit"
          size="sm"
        />
      </div>
    </div>
  </u-page>
</template>
