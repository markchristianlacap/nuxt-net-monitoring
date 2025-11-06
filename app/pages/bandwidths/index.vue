<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { DateFormatter, getLocalTimeZone } from '@internationalized/date'
import { debounce } from 'perfect-debounce'

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const query = reactive({
  page: 1,
  limit: 10,
  start: null as string | null,
  end: null as string | null,
})

const dateRange = ref<any>({
  start: undefined,
  end: undefined,
})

const { data: bandwidthResponse, refresh } = await useFetch('/api/bandwidths', {
  query,
  immediate: true,
})

const debouncedRefresh = debounce(() => refresh(), 300)

watch(query, debouncedRefresh, { deep: true })
watch(dateRange, () => {
  query.start = dateRange.value?.start?.toString() ?? null
  query.end = dateRange.value?.end?.toString() ?? null
}, { deep: true })

const columns: TableColumn<any>[] = [
  { accessorKey: 'id', header: '#', cell: ({ row }) => `#${row.getValue('id')}` },
  {
    accessorKey: 'timestamp',
    header: 'Date',
    cell: ({ row }) =>
      new Date(row.getValue('timestamp')).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
  },
  { accessorKey: 'host', header: 'Host' },
  { accessorKey: 'interface', header: 'Interface' },
  {
    accessorKey: 'inMbps',
    header: () => h('div', { class: 'text-right' }, 'Download (Mbps)'),
    cell: ({ row }) =>
      h('div', { class: 'text-right font-medium text-blue-400' }, `${Number(row.getValue('inMbps')).toFixed(2)}`),
  },
  {
    accessorKey: 'outMbps',
    header: () => h('div', { class: 'text-right' }, 'Upload (Mbps)'),
    cell: ({ row }) =>
      h('div', { class: 'text-right font-medium text-rose-400' }, `${Number(row.getValue('outMbps')).toFixed(2)}`),
  },
]

function download() {
  const a = document.createElement('a')
  a.href = '/api/bandwidths/download' + `?start=${query.start}&end=${query.end}`
  a.download = 'bandwidths.csv'
  a.click()
}
</script>

<template>
  <u-page>
    <div class="container mx-auto mt-3 sm:mt-6 space-y-4 text-slate-100 px-2 sm:px-0">
      <div class="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-3">
        <h2 class="text-xl sm:text-2xl font-bold tracking-tight flex-1">
          Bandwidth Monitoring
        </h2>
        <div class="flex gap-2 w-full sm:w-auto">
          <UPopover class="flex-1 sm:flex-none">
            <UButton color="neutral" variant="subtle" icon="i-lucide-calendar" class="w-full sm:w-auto justify-start">
              <template v-if="dateRange.start">
                <template v-if="dateRange.end">
                  <span class="hidden sm:inline">{{ df.format(dateRange.start.toDate(getLocalTimeZone())) }} - {{ df.format(dateRange.end.toDate(getLocalTimeZone())) }}</span>
                  <span class="sm:hidden">{{ df.format(dateRange.start.toDate(getLocalTimeZone())) }}</span>
                </template>
                <template v-else>
                  {{ df.format(dateRange.start.toDate(getLocalTimeZone())) }}
                </template>
              </template>
              <template v-else>
                Pick a date
              </template>
            </UButton>
            <template #content>
              <UCalendar v-model="dateRange" :number-of-months="2" range />
            </template>
          </UPopover>
          <UButton color="neutral" variant="subtle" icon="i-lucide-download" @click="download" />
        </div>
      </div>

      <BandwidthChart :start="query.start" :end="query.end" />

      <div class="overflow-x-auto -mx-2 sm:mx-0">
        <u-table
          :data="bandwidthResponse?.data"
          :columns="columns"
          class="rounded-2xl overflow-hidden border border-slate-700/40 bg-slate-900/50 min-w-[600px]"
        />
      </div>

      <div class="flex flex-col sm:flex-row justify-between items-center gap-3 mt-3 text-xs sm:text-sm text-slate-400">
        <div>Total: {{ bandwidthResponse?.total?.toLocaleString() ?? 0 }}</div>
        <u-pagination
          v-model:page="query.page"
          :total="bandwidthResponse?.total ?? 0"
          :page-size="query.limit"
          size="sm"
        />
      </div>
    </div>
  </u-page>
</template>
