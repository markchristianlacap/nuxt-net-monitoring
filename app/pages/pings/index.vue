<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const { query, downloadCSV, isDownloading } = useDataTable('pings', 'pings.csv')

// Override default pagination limit and add status filter
query.limit = Number(useRoute().query.limit) || 10
query.status = useRoute().query.status as 'online' | 'offline' | null || null
const statusFilterItems = [
  { label: 'All statuses', value: 'all' },
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
]
const selectedStatus = computed({
  get: () => query.status || 'all',
  set: (value: string) => {
    query.status = value === 'all'
      ? null
      : value as 'online' | 'offline'
  },
})

const { data } = await useFetch('/api/pings', {
  query,
})

const columns: TableColumn<any>[] = [
  createIdColumn(),
  createTimestampColumn(),
  { accessorKey: 'host', header: 'Host' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const value = row.getValue('status') as string
      const color = value === 'online'
        ? 'success'
        : 'error'
      const label = value.charAt(0).toUpperCase() + value.slice(1)
      return h(UBadge, { variant: 'subtle', color, class: 'capitalize' }, () => label)
    },
  },
  {
    accessorKey: 'latency',
    header: () => h('div', { class: 'text-right' }, 'Latency (ms)'),
    cell: ({ row }) =>
      h('div', { class: `text-right font-medium ${DATA_COLORS.latency}` }, `${row.getValue('latency')} ms`),
  },
]
</script>

<template>
  <div class="space-y-6">
    <CommonPageHeader title="Ping Results">
      <template #actions>
        <CommonResultsFilters
          v-model:start="query.start"
          v-model:end="query.end"
          :is-downloading="isDownloading"
          @download="downloadCSV"
        >
          <template #filter>
            <USelect
              v-model="selectedStatus"
              :items="statusFilterItems"
              aria-label="Filter by status"
              class="w-full sm:w-48"
            />
          </template>
        </CommonResultsFilters>
      </template>
    </CommonPageHeader>
    <PingChart :start="query.start" :end="query.end" :status="query.status" />

    <div class="max-w-full overflow-x-auto">
      <u-table
        :data="data?.data"
        :columns="columns"
        class="min-w-[600px]"
        :class="TABLE_CLASSES"
      />
    </div>

    <div class="flex flex-col items-center justify-between gap-3 text-sm text-muted sm:flex-row">
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
</template>
