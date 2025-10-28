<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import type { TableColumn } from '@nuxt/ui'
import { DateFormatter, getLocalTimeZone } from '@internationalized/date'
import { debounce } from 'perfect-debounce'

const df = new DateFormatter('en-US', { dateStyle: 'medium' })
const UBadge = resolveComponent('UBadge')

const query = reactive({
  page: 1,
  limit: 10,
  start: null as string | null,
  end: null as string | null,
  status: null as 'online' | 'offline' | null,
})

const dateRange = ref<{ start: CalendarDate | null, end: CalendarDate | null }>({
  start: null,
  end: null,
})

const { data: pingResponse, refresh } = await useFetch('/api/pings', {
  query,
  immediate: true,
})

const debouncedRefresh = debounce(() => refresh(), 300)

watch(query, debouncedRefresh, { deep: true })
watch(dateRange, () => {
  query.start = dateRange.value.start?.toString() ?? null
  query.end = dateRange.value.end?.toString() ?? null
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
  const a = document.createElement('a')
  a.href = '/api/pings/download' + `?start=${query.start}&end=${query.end}`
  a.download = 'pings.csv'
  a.click()
}
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
      </div>

      <div class="overflow-x-auto -mx-2 sm:mx-0">
        <u-table
          :data="pingResponse?.data"
          :columns="columns"
          class="rounded-2xl overflow-hidden border border-slate-700/40 bg-slate-900/50 min-w-full"
        />
      </div>

      <div class="flex flex-col sm:flex-row justify-between items-center gap-3 mt-3 text-xs sm:text-sm text-slate-400">
        <div>
          Total: {{ pingResponse?.total?.toLocaleString() ?? 0 }}
        </div>
        <u-pagination
          v-model:page="query.page"
          :total="pingResponse?.total ?? 0"
          :page-size="query.limit"
          size="sm"
        />
      </div>
    </div>
  </u-page>
</template>

<style scoped>
:deep(.u-table) {
  background: transparent;
}
</style>
