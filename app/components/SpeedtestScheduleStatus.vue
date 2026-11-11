<script setup lang="ts">
import type { SpeedtestScheduleStatus as ScheduleStatus } from '~~/shared/types/speedtest-schedule'

const status = ref<ScheduleStatus | null>(null)
const unavailable = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | undefined
let isRefreshing = false

async function refreshStatus() {
  if (isRefreshing)
    return
  isRefreshing = true

  try {
    status.value = await $fetch<ScheduleStatus>('/api/speedtest/schedule-status')
    unavailable.value = false
  }
  catch {
    unavailable.value = true
  }
  finally {
    isRefreshing = false
  }
}

function formatDate(value: string | null) {
  if (!value)
    return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

onMounted(() => {
  void refreshStatus()
  refreshTimer = setInterval(() => void refreshStatus(), 5000)
})

onBeforeUnmount(() => {
  if (refreshTimer)
    clearInterval(refreshTimer)
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-highlighted">
            Scheduled speed tests
          </h2>
          <p class="mt-1 text-sm text-muted">
            Tests run one at a time across the configured interfaces.
          </p>
        </div>
        <UBadge v-if="status?.running" color="success" variant="subtle" icon="i-lucide-loader-circle" class="animate-pulse">
          Running
        </UBadge>
        <UBadge v-else-if="status?.enabled" color="primary" variant="subtle">
          Scheduled
        </UBadge>
        <UBadge v-else color="neutral" variant="subtle">
          Loading
        </UBadge>
      </div>
    </template>

    <p v-if="unavailable" class="mb-4 text-sm text-error" role="status">
      Could not refresh the schedule status. Retrying automatically.
    </p>

    <div v-if="status" class="space-y-5">
      <div v-if="status.running" class="flex items-center gap-3 rounded-lg bg-muted p-4" role="status" aria-live="polite">
        <UIcon name="i-lucide-loader-circle" class="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
        <p class="font-medium text-highlighted">
          Testing {{ status.currentInterface ?? 'next interface' }}
          <span v-if="status.currentIndex" class="font-normal text-muted">
            · {{ status.currentIndex }} of {{ status.interfaces.length }}
          </span>
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <p class="text-sm text-muted">
            Next run
          </p>
          <p class="mt-1 font-medium text-default">
            {{ formatDate(status.nextRunAt) }}
          </p>
        </div>
        <div>
          <p class="text-sm text-muted">
            Last completed test
          </p>
          <div v-if="status.lastAttempt" class="mt-1 flex flex-wrap items-center gap-2">
            <UBadge :color="status.lastAttempt.status === 'success' ? 'success' : 'error'" variant="subtle">
              {{ status.lastAttempt.status === 'success' ? 'Succeeded' : 'Failed' }}
            </UBadge>
            <span class="text-sm text-toned">
              {{ status.lastAttempt.interfaceName }} · {{ formatDate(status.lastAttempt.completedAt) }}
            </span>
          </div>
          <p v-else class="mt-1 font-medium text-default">
            No tests completed yet
          </p>
        </div>
      </div>

      <div>
        <p class="text-sm text-muted">
          Run order
        </p>
        <ol class="mt-2 flex flex-wrap gap-2">
          <li v-for="(interfaceName, index) in status.interfaces" :key="`${interfaceName}-${index}`">
            <UBadge :color="status.running && status.currentIndex === index + 1 ? 'primary' : 'neutral'" variant="subtle">
              {{ index + 1 }}. {{ interfaceName }}
            </UBadge>
          </li>
        </ol>
      </div>
    </div>

    <div v-else class="space-y-3" aria-label="Loading scheduled speed-test status">
      <USkeleton class="h-5 w-48" />
      <USkeleton class="h-12 w-full" />
    </div>
  </UCard>
</template>
