<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const { query, downloadCSV, isDownloading } = useDataTable('pings', 'pings.csv')

// Override default pagination limit and add status filter
query.limit = Number(useRoute().query.limit) || 10
query.status = useRoute().query.status as 'online' | 'offline' | null || null

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
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-muted">Status</span>
            <URadioGroup
              v-model="query.status"
              size="sm"
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
          <common-date-range v-model:start="query.start" v-model:end="query.end" />
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-download"
            aria-label="Download ping results as CSV"
            :loading="isDownloading"
            :disabled="isDownloading"
            @click="downloadCSV"
          />
        </div>
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
