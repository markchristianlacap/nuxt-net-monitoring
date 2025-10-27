<script lang="ts" setup>
import type { CalendarDate } from '@internationalized/date'
import type { TableColumn } from '@nuxt/ui'
import { DateFormatter, getLocalTimeZone } from '@internationalized/date'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium',
})

const query = ref({
  page: 1,
  limit: 10,
  start: null as string | null,
  end: null as string | null,
})
const dateRange = shallowRef({
  start: null as CalendarDate | null,
  end: null as CalendarDate | null,
})
const bandwidths = await useFetch('/api/bandwidths', {
  query: query.value,
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => `#${row.getValue('id')}`,
  },
  {
    accessorKey: 'timestamp',
    header: 'Date',
    cell: ({ row }) => {
      return new Date(row.getValue('timestamp')).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    },
  },
  {
    accessorKey: 'host',
    header: 'Host',
  },
  {
    accessorKey: 'inMbps',
    header: () => h('div', { class: 'text-right' }, 'Download'),
    cell: ({ row }) => {
      return h('div', { class: 'text-right font-medium' }, `${Number(row.getValue('inMbps')).toFixed(2)} mbps`)
    },
  },
  {
    accessorKey: 'outMbps',
    header: () => h('div', { class: 'text-right' }, 'Upload'),
    cell: ({ row }) => {
      return h('div', { class: 'text-right font-medium' }, `${Number(row.getValue('outMbps')).toFixed(2)} mbps`)
    },
  },
]
watch(() => dateRange.value, () => {
  query.value.start = dateRange.value.start?.toString() ?? null
  query.value.end = dateRange.value.end?.toString() ?? null
}, { deep: true })
</script>

<template>
  <u-page>
    <div class="container mx-auto mt-5">
      <div class="flex gap-2 justify-end items-center">
        <div class="text-xl font-bold">
          Bandwidth Monitoring
        </div>
        <div class="flex-1" />
        <UPopover>
          <UButton color="neutral" variant="subtle" icon="i-lucide-calendar">
            <template v-if="dateRange.start">
              <template v-if="dateRange.end">
                {{ df.format(dateRange.start.toDate(getLocalTimeZone())) }} - {{ df.format(dateRange.end.toDate(getLocalTimeZone())) }}
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
            <UCalendar
              v-model="dateRange"
              :number-of-months="2"
              range
            />
          </template>
        </UPopover>
      </div>
      <u-table
        :data="bandwidths.data.value?.data"
        :columns
      />
      <div class="flex justify-between mt-2">
        <div>
          Total: {{ bandwidths.data.value?.total.toLocaleString() }}
        </div>
        <u-pagination
          v-model:page="query.page"
          :total="bandwidths.data.value?.total"
        />
      </div>
    </div>
  </u-page>
</template>
