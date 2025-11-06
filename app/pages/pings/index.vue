<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const route = useRoute()
const today = new Date()
today.setHours(0, 0, 0, 0)
const end = new Date()
end.setHours(23, 59, 59, 999)
const query = reactive({
  page: Number(route.query.page) || 1,
  limit: Number(route.query.limit) || 10,
  start: (route.query.start as string | null) || today.toISOString() as string | null,
  end: (route.query.end as string | null) || end.toISOString() as string | null,
  status: route.query.status as 'online' | 'offline' | null || null,
})

const { data } = await useFetch('/api/pings', {
  query,
})

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
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const value = row.getValue('status') as string
      const color = value === 'online' ? 'success' : 'error'
      const label = value.charAt(0).toUpperCase() + value.slice(1)
      return h(UBadge, { variant: 'subtle', color, class: 'capitalize' }, () => label)
    },
  },
  {
    accessorKey: 'latency',
    header: () => h('div', { class: 'text-right' }, 'Latency (ms)'),
    cell: ({ row }) =>
      h('div', { class: 'text-right font-medium text-slate-200' }, `${row.getValue('latency')} ms`),
  },
]
function download() {
  let url = '/api/pings/download'
  const params = []
  if (query.start)
    params.push(`start=${query.start}`)
  if (query.end)
    params.push(`end=${query.end}`)
  if (params.length)
    url += `?${params.join('&')}`
  const a = document.createElement('a')
  a.href = url
  a.download = 'pings.csv'
  a.click()
}
watch(query, () => {
  navigateTo({ query })
}, { deep: true })
</script>

<template>
  <u-page>
    <div class="container mx-auto mt-3 sm:mt-5 space-y-4 text-slate-100 px-2 sm:px-0">
      <div class="flex flex-col sm:flex-row flex-wrap gap-3 justify-between items-start sm:items-center">
        <h2 class="text-xl sm:text-2xl font-bold">
          Ping Results
        </h2>

        <div class="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center w-full sm:w-auto">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm sm:text-base">Status:</span>
            <URadioGroup
              v-model="query.status"
              size="xs"
              orientation="horizontal"
              variant="table"
              :items="[
                { label: 'All', value: null },
                { label: 'Online', value: 'online' },
                { label: 'Offline', value: 'offline' },
              ]"
              label-key="label"
              value-key="value"
            />
          </div>

          <div class="flex gap-2 w-full sm:w-auto">
            <common-date-range v-model:start="query.start" v-model:end="query.end" />
            <UButton color="neutral" variant="subtle" icon="i-lucide-download" @click="download" />
          </div>
        </div>
      </div>

      <PingChart :start="query.start" :end="query.end" :status="query.status" />

      <div class="overflow-x-auto -mx-2 sm:mx-0">
        <u-table
          :data="data?.data"
          :columns="columns"
          class="rounded-2xl overflow-hidden border border-slate-700/40 bg-slate-900/50 min-w-[600px]"
        />
      </div>

      <div class="flex flex-col sm:flex-row justify-between items-center gap-3 mt-3 text-xs sm:text-sm text-slate-400">
        <div>
          Total: {{ data?.total?.toLocaleString() ?? 0 }}
        </div>
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
