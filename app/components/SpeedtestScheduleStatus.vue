<script setup lang="ts">
const status = ref<SpeedtestScheduleStatus | null>(null)
const unavailable = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | undefined
let isRefreshing = false
const currentTest = computed(() => status.value?.currentTest ?? null)
const activeSpeed = computed(() => currentTest.value?.phase === 'upload'
  ? currentTest.value.uploadMbps ?? 0
  : currentTest.value?.downloadMbps ?? 0)
const gaugeMax = computed(() => {
  const peak = Math.max(100, activeSpeed.value)
  const increment = 10 ** Math.floor(Math.log10(peak)) / 2
  return Math.ceil(peak / increment) * increment
})
const phaseLabel = computed(() => ({
  starting: 'Starting scheduled test',
  ping: 'Measuring latency',
  download: 'Measuring download speed',
  upload: 'Measuring upload speed',
  complete: 'Test complete',
  error: 'Test failed',
}[currentTest.value?.phase ?? 'starting']))

async function refreshStatus() {
  if (isRefreshing)
    return
  isRefreshing = true

  try {
    status.value = await $fetch<SpeedtestScheduleStatus>('/api/speedtest/schedule-status')
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
  refreshTimer = setInterval(() => void refreshStatus(), 1000)
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
        <UBadge v-else-if="status" color="neutral" variant="subtle">
          Disabled
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

      <section
        v-if="status.running && currentTest"
        class="grid gap-5 rounded-lg border border-default p-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)] sm:items-center"
        aria-label="Current scheduled speed test"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2" role="status" aria-live="polite">
            <span
              class="size-2 rounded-full"
              :class="{
                'animate-pulse bg-amber-500': currentTest.phase === 'starting' || currentTest.phase === 'ping',
                'animate-pulse bg-blue-600 dark:bg-blue-400': currentTest.phase === 'download',
                'animate-pulse bg-green-600 dark:bg-green-400': currentTest.phase === 'upload',
                'bg-green-600 dark:bg-green-400': currentTest.phase === 'complete',
                'bg-red-600 dark:bg-red-400': currentTest.phase === 'error',
              }"
            />
            <p class="font-medium text-highlighted">
              {{ phaseLabel }}
            </p>
          </div>

          <SpeedtestGauge
            v-if="['download', 'upload', 'complete'].includes(currentTest.phase)"
            class="mt-3"
            :value="activeSpeed"
            :max="gaugeMax"
            :label="currentTest.phase === 'upload' ? 'Upload' : 'Download'"
            :phase="currentTest.phase === 'upload' ? 'upload' : 'download'"
          />
          <UProgress
            v-if="['ping', 'download', 'upload'].includes(currentTest.phase)"
            :model-value="currentTest.progress * 100"
            class="mt-4"
            aria-label="Speed test progress"
          />
          <p v-if="currentTest.phase === 'error'" class="mt-3 text-sm text-error" role="alert">
            This interface test failed. The scheduler will continue with the next interface.
          </p>
        </div>

        <dl class="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
          <div>
            <dt class="text-muted">
              Download
            </dt>
            <dd class="mt-0.5 font-semibold tabular-nums text-blue-700 dark:text-blue-300">
              {{ currentTest.downloadMbps === null ? '—' : `${currentTest.downloadMbps.toFixed(2)} Mbps` }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              Upload
            </dt>
            <dd class="mt-0.5 font-semibold tabular-nums text-green-700 dark:text-green-300">
              {{ currentTest.uploadMbps === null ? '—' : `${currentTest.uploadMbps.toFixed(2)} Mbps` }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              Latency
            </dt>
            <dd class="mt-0.5 font-semibold tabular-nums text-default">
              {{ currentTest.latencyMs === null ? '—' : `${currentTest.latencyMs.toFixed(1)} ms` }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              Provider
            </dt>
            <dd class="mt-0.5 truncate font-medium text-default" :title="currentTest.isp ?? undefined">
              {{ currentTest.isp ?? 'Detecting…' }}
            </dd>
          </div>
          <div v-if="currentTest.publicIp" class="col-span-2 min-w-0">
            <dt class="text-muted">
              Public IP
            </dt>
            <dd class="mt-0.5 break-all font-medium text-default">
              {{ currentTest.publicIp }}
            </dd>
          </div>
          <div v-if="currentTest.resultUrl" class="col-span-2">
            <a
              :href="currentTest.resultUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              View shared result
              <UIcon name="i-lucide-arrow-up-right" aria-hidden="true" />
            </a>
          </div>
        </dl>
      </section>

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
