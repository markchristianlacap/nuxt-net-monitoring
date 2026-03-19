<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { createIdColumn, createTimestampColumn } from '~/composables/useTableColumns'
import { DATA_COLORS, TABLE_CLASSES } from '~/constants/tableStyles'

const UIcon = resolveComponent('UIcon')
const { query, downloadCSV, isDownloading } = useDataTable('speedtest-results', 'speedtest-results.csv')

// Override default pagination limit for speedtest results
query.limit = Number(useRoute().query.limit) || 10

const { data } = await useFetch('/api/speedtest-results', {
  query,
})

const columns: TableColumn<any>[] = [
  createIdColumn(),
  createTimestampColumn(),
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
      h('a', { href: row.getValue('url'), target: '_blank' }, h(UIcon, { name: 'i-lucide-external-link', class: 'text-primary' })),
  },
]
</script>

<template>
  <u-page>
    <div class="mt-3 sm:mt-5 space-y-4 text-slate-100 px-2 sm:px-0">
      <div class="flex flex-col sm:flex-row flex-wrap gap-3 justify-between items-start sm:items-center">
        <h2 class="text-xl sm:text-2xl font-bold">
          Speedtest Results Log
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

      <SpeedtestChart :start="query.start" :end="query.end" />

      <div class="overflow-x-auto -mx-2 sm:mx-0">
        <u-table
          :data="data?.data"
          :columns="columns"
          class="min-w-[800px]"
          :class="TABLE_CLASSES"
        />
      </div>

      <div class="flex flex-col sm:flex-row justify-between items-center gap-3 mt-3 text-xs sm:text-sm text-slate-400">
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
