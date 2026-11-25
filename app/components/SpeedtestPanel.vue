<script setup lang="ts">
const { status, unavailable } = useSpeedtestStatus()
const requestError = ref('')
const requesting = ref(false)
const stopping = ref(false)
const selectedInterface = ref(SYSTEM_DEFAULT_INTERFACE_VALUE)
const AUTOMATIC_SERVER_VALUE = 'automatic'
const selectedServerId = ref<string>(AUTOMATIC_SERVER_VALUE)
const { data: availableInterfaces } = await useFetch<Array<{ name: string, ipAddress: string }>>('/api/speedtest/interfaces')
const interfaceItems = computed(() => [
  { label: 'System default', value: SYSTEM_DEFAULT_INTERFACE_VALUE },
  ...(availableInterfaces.value ?? []).map(item => ({
    label: `${item.name} · ${item.ipAddress}`,
    value: item.name,
  })),
])
const {
  data: availableServers,
  status: serversStatus,
  error: serversError,
  execute: fetchServers,
} = await useLazyFetch<SpeedtestServer[]>('/api/speedtest/servers', {
  immediate: false,
  default: () => [],
})
const serverItems = computed(() => [
  {
    label: 'Automatic (nearest server)',
    value: AUTOMATIC_SERVER_VALUE,
    description: 'Let Speedtest choose the best server',
  },
  ...(availableServers.value ?? []).map(server => ({
    label: server.name,
    value: String(server.id),
    description: `${server.location}, ${server.country} · ${server.host}`,
  })),
])
const currentTest = computed(() => status.value?.currentTest ?? null)
const isRunning = computed(() => status.value?.running ?? false)
const activeSpeed = computed(() => currentTest.value?.phase === 'upload'
  ? currentTest.value.uploadMbps ?? 0
  : currentTest.value?.downloadMbps ?? 0)
const gaugeMax = computed(() => {
  const peak = Math.max(100, activeSpeed.value)
  const increment = 10 ** Math.floor(Math.log10(peak)) / 2
  return Math.ceil(peak / increment) * increment
})
const phaseLabel = computed(() => ({
  starting: 'Starting test',
  ping: 'Measuring latency',
  download: 'Measuring download speed',
  upload: 'Measuring upload speed',
  complete: 'Test complete',
  error: 'Test failed',
  cancelled: 'Test stopped',
}[currentTest.value?.phase ?? 'starting']))

function formatDate(value: string | null) {
  if (!value)
    return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function loadServers(open: boolean) {
  if (open && serversStatus.value !== 'pending' && serversStatus.value !== 'success')
    await fetchServers()
}

async function startTest() {
  if (isRunning.value || requesting.value)
    return

  requesting.value = true
  requestError.value = ''

  try {
    await $fetch('/api/speedtest', {
      method: 'POST',
      body: {
        interfaceName: selectedInterface.value === SYSTEM_DEFAULT_INTERFACE_VALUE
          ? null
          : selectedInterface.value,
        serverId: selectedServerId.value === AUTOMATIC_SERVER_VALUE
          ? null
          : Number(selectedServerId.value),
      },
    })
  }
  catch (error) {
    console.error('Unable to start manual speedtest:', error)
    const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
    requestError.value = fetchError.data?.statusMessage
      || fetchError.statusMessage
      || 'The speed test could not start. Check the network connection, then try again.'
  }
  finally {
    requesting.value = false
  }
}

async function stopTest() {
  if (!isRunning.value || status.value?.source !== 'manual' || stopping.value)
    return

  stopping.value = true
  requestError.value = ''

  try {
    const response = await $fetch<{ stopped: boolean }>('/api/speedtest/stop', { method: 'POST' })
    if (!response.stopped)
      requestError.value = 'The manual speed test has already finished.'
  }
  catch (error) {
    console.error('Unable to stop manual speedtest:', error)
    requestError.value = 'The manual speed test could not be stopped. Try again.'
  }
  finally {
    stopping.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 class="font-semibold text-highlighted">
            Speedtest
          </h2>
          <p class="mt-1 text-sm text-muted">
            Manual and scheduled tests share one live run.
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <UBadge v-if="status?.running" color="success" variant="subtle" icon="i-lucide-loader-circle" class="animate-pulse">
              Running
            </UBadge>
            <UBadge v-else-if="status?.enabled" color="primary" variant="subtle">
              Scheduled
            </UBadge>
            <UBadge v-else-if="status" color="neutral" variant="subtle">
              Schedule off
            </UBadge>
            <UBadge v-else color="neutral" variant="subtle">
              Connecting
            </UBadge>
          </div>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <UFormField label="Test interface" class="min-w-0">
            <USelect
              v-model="selectedInterface"
              :items="interfaceItems"
              aria-label="Network interface for manual speedtest"
              class="w-full sm:min-w-56"
              :disabled="isRunning || requesting"
            />
          </UFormField>
          <UFormField label="Test server" description="Choose a server or use automatic selection." class="min-w-0">
            <USelectMenu
              v-model="selectedServerId"
              value-key="value"
              :items="serverItems"
              :filter-fields="['label', 'description']"
              :loading="serversStatus === 'pending'"
              aria-label="Speedtest server for manual test"
              class="w-full sm:min-w-64"
              :disabled="isRunning || requesting"
              @update:open="loadServers"
            />
          </UFormField>
          <UButton
            v-if="status?.running && status.source === 'manual' && currentTest?.phase !== 'complete'"
            color="error"
            variant="soft"
            :disabled="stopping"
            :loading="stopping"
            icon="i-lucide-square-stop"
            @click="stopTest"
          >
            Stop test
          </UButton>
          <UButton
            v-else
            :disabled="isRunning || requesting"
            :loading="requesting || (isRunning && currentTest?.phase === 'complete')"
            :icon="isRunning ? 'i-lucide-loader-circle' : 'i-lucide-play'"
            @click="startTest"
          >
            {{ isRunning ? (currentTest?.phase === 'complete' ? 'Finishing test' : 'Test running') : currentTest ? 'Run again' : 'Start test' }}
          </UButton>
        </div>
      </div>
    </template>

    <p v-if="serversError" class="mb-4 text-sm text-warning" role="status">
      The server list could not be loaded. Automatic server selection is still available.
    </p>

    <p v-if="requestError" class="mb-4 text-sm text-error" role="alert">
      {{ requestError }}
    </p>

    <p v-if="unavailable" class="mb-4 text-sm text-error" role="status">
      Live speed-test updates are unavailable. Reconnecting automatically.
    </p>

    <div v-if="status" class="space-y-5">
      <div v-if="status.currentTest" class="flex items-center gap-3 rounded-lg bg-muted p-4" role="status" aria-live="polite">
        <UIcon
          :name="status.running ? 'i-lucide-loader-circle' : currentTest?.phase === 'error' ? 'i-lucide-circle-x' : currentTest?.phase === 'cancelled' ? 'i-lucide-circle-stop' : 'i-lucide-circle-check'"
          class="size-5 shrink-0 text-primary"
          :class="{ 'animate-spin': status.running }"
          aria-hidden="true"
        />
        <p class="font-medium text-highlighted">
          {{ status.running ? (status.source === 'manual' ? 'Manual test on' : 'Testing') : 'Last test on' }}
          {{ status.currentInterface ?? 'selected interface' }}
          <span v-if="status.running && status.source === 'scheduled' && status.currentIndex" class="font-normal text-muted">
            · {{ status.currentIndex }} of {{ status.interfaces.length }}
          </span>
        </p>
      </div>

      <section
        v-if="currentTest"
        class="grid gap-5 rounded-lg border border-default p-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)] sm:items-center"
        aria-label="Current speed test"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2" role="status" aria-live="polite">
            <span
              class="size-2 rounded-full"
              :class="{
                'animate-pulse bg-warning': currentTest.phase === 'starting' || currentTest.phase === 'ping',
                'animate-pulse bg-primary': currentTest.phase === 'download',
                'animate-pulse bg-success': currentTest.phase === 'upload',
                'bg-success': currentTest.phase === 'complete',
                'bg-error': currentTest.phase === 'error',
                'bg-neutral': currentTest.phase === 'cancelled',
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
            {{ currentTest.errorMessage || 'This interface test failed.' }}
          </p>
        </div>

        <dl class="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
          <div>
            <dt class="font-medium text-primary">
              Download
            </dt>
            <dd class="mt-0.5 font-semibold tabular-nums text-primary">
              {{ currentTest.downloadMbps === null ? '—' : `${currentTest.downloadMbps.toFixed(2)} Mbps` }}
            </dd>
          </div>
          <div>
            <dt class="font-medium text-success">
              Upload
            </dt>
            <dd class="mt-0.5 font-semibold tabular-nums text-success">
              {{ currentTest.uploadMbps === null ? '—' : `${currentTest.uploadMbps.toFixed(2)} Mbps` }}
            </dd>
          </div>
          <div>
            <dt class="font-medium text-warning">
              Latency
            </dt>
            <dd class="mt-0.5 font-semibold tabular-nums text-default">
              {{ currentTest.latencyMs === null ? '—' : `${currentTest.latencyMs.toFixed(1)} ms` }}
            </dd>
          </div>
          <div>
            <dt class="font-medium text-toned">
              Provider
            </dt>
            <dd class="mt-0.5 truncate font-medium text-default" :title="currentTest.isp ?? undefined">
              {{ currentTest.isp ?? 'Detecting…' }}
            </dd>
          </div>
          <div v-if="currentTest.publicIp" class="col-span-2 min-w-0">
            <dt class="font-medium text-primary">
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
          <p class="text-sm font-medium text-primary">
            Next run
          </p>
          <p class="mt-1 font-medium text-default">
            {{ formatDate(status.nextRunAt) }}
          </p>
        </div>
        <div>
          <p class="text-sm font-medium text-warning">
            Last test attempt
          </p>
          <div v-if="status.lastAttempt" class="mt-1 flex flex-wrap items-center gap-2">
            <UBadge :color="status.lastAttempt.status === 'success' ? 'success' : status.lastAttempt.status === 'failed' ? 'error' : 'neutral'" variant="subtle">
              {{ status.lastAttempt.status === 'success' ? 'Succeeded' : status.lastAttempt.status === 'failed' ? 'Failed' : 'Cancelled' }}
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
        <p class="text-sm font-medium text-toned">
          Run order
        </p>
        <ol class="mt-2 flex flex-wrap gap-2">
          <li v-for="(interfaceName, index) in status.interfaces" :key="`${interfaceName}-${index}`">
            <UBadge :color="status.running && status.source === 'scheduled' && status.currentIndex === index + 1 ? 'primary' : 'neutral'" variant="subtle">
              {{ index + 1 }}. {{ interfaceName }}
            </UBadge>
          </li>
        </ol>
      </div>
    </div>

    <div v-else class="space-y-3" aria-label="Loading speed-test status">
      <USkeleton class="h-5 w-48" />
      <USkeleton class="h-12 w-full" />
    </div>
  </UCard>
</template>
