<script setup lang="ts">
type ManualSpeedtestPhase = 'idle' | 'initializing' | 'ping' | 'download' | 'upload' | 'complete' | 'error'

const currentDownload = ref(0)
const currentUpload = ref(0)
const peakSpeed = ref(0)
const downloadMeasured = ref(false)
const uploadMeasured = ref(false)
const latency = ref(0)
const latencyMeasured = ref(false)
const isp = ref('')
const publicIp = ref('')
const resultUrl = ref('')
const errorMessage = ref('')
const selectedInterface = ref(SYSTEM_DEFAULT_INTERFACE_VALUE)
const testedInterfaceName = ref('')
const status = ref<ManualSpeedtestPhase>('idle')
const progress = ref(0)
let reader: ReadableStreamDefaultReader<string> | null = null

const { data: availableInterfaces } = await useFetch<Array<{ name: string, ipAddress: string }>>('/api/speedtest/interfaces')
const interfaceItems = computed(() => [
  { label: 'System default', value: SYSTEM_DEFAULT_INTERFACE_VALUE },
  ...(availableInterfaces.value ?? []).map(item => ({
    label: `${item.name} · ${item.ipAddress}`,
    value: item.name,
  })),
])
const selectedInterfaceLabel = computed(() => selectedInterface.value === SYSTEM_DEFAULT_INTERFACE_VALUE
  ? 'System default'
  : selectedInterface.value)
const isRunning = computed(() => [
  'initializing',
  'ping',
  'download',
  'upload',
].includes(status.value))
const activeSpeed = computed(() => status.value === 'upload'
  ? currentUpload.value
  : currentDownload.value)
const gaugeMax = computed(() => {
  const peak = Math.max(100, peakSpeed.value)
  const increment = 10 ** Math.floor(Math.log10(peak)) / 2
  return Math.ceil(peak / increment) * increment
})
const statusText = computed(() => ({
  idle: 'Ready to start',
  initializing: 'Initializing test…',
  ping: 'Measuring latency…',
  download: 'Measuring download speed…',
  upload: 'Measuring upload speed…',
  complete: 'Test complete',
  error: 'Test failed',
}[status.value]))

function updateSpeed(type: 'download' | 'upload', value: number) {
  const speed = toMbps(value)
  if (type === 'download') {
    currentDownload.value = speed
    downloadMeasured.value = true
  }
  else {
    currentUpload.value = speed
    uploadMeasured.value = true
  }
  peakSpeed.value = Math.max(peakSpeed.value, speed)
}

function resetState() {
  currentDownload.value = 0
  currentUpload.value = 0
  peakSpeed.value = 0
  downloadMeasured.value = false
  uploadMeasured.value = false
  latency.value = 0
  latencyMeasured.value = false
  resultUrl.value = ''
  isp.value = ''
  publicIp.value = ''
  errorMessage.value = ''
  testedInterfaceName.value = ''
  progress.value = 0
}

function handleEvent(event: SpeedtestEvent) {
  switch (event.type) {
    case 'testStart':
      isp.value = event.isp ?? ''
      publicIp.value = event.interface?.externalIp ?? ''
      testedInterfaceName.value = event.interface?.name || selectedInterfaceLabel.value
      status.value = 'ping'
      break
    case 'ping':
      if (event.ping?.latency !== undefined) {
        latency.value = event.ping.latency
        latencyMeasured.value = true
      }
      progress.value = event.ping?.progress ?? progress.value
      status.value = 'ping'
      break
    case 'download':
      if (progress.value >= 1)
        progress.value = 0
      status.value = 'download'
      if (event.download?.bandwidth !== undefined)
        updateSpeed('download', event.download.bandwidth)
      progress.value = event.download?.progress ?? progress.value
      break
    case 'upload':
      if (progress.value >= 1)
        progress.value = 0
      status.value = 'upload'
      if (event.upload?.bandwidth !== undefined)
        updateSpeed('upload', event.upload.bandwidth)
      progress.value = event.upload?.progress ?? progress.value
      break
    case 'result':
      if (event.ping?.latency !== undefined) {
        latency.value = event.ping.latency
        latencyMeasured.value = true
      }
      resultUrl.value = event.result?.url ?? ''
      testedInterfaceName.value = event.interface?.name || testedInterfaceName.value || selectedInterfaceLabel.value
      if (event.download?.bandwidth !== undefined)
        updateSpeed('download', event.download.bandwidth)
      if (event.upload?.bandwidth !== undefined)
        updateSpeed('upload', event.upload.bandwidth)
      status.value = 'complete'
      break
    case 'error':
      errorMessage.value = event.message || 'The test failed. Check the Speedtest CLI output and network connection.'
      status.value = 'error'
      break
  }
}

async function startTest() {
  if (isRunning.value)
    return

  resetState()
  status.value = 'initializing'

  try {
    const response = await $fetch<ReadableStream>('/api/speedtest', {
      method: 'POST',
      body: {
        interfaceName: selectedInterface.value === SYSTEM_DEFAULT_INTERFACE_VALUE
          ? null
          : selectedInterface.value,
      },
      responseType: 'stream',
    })

    reader = response.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        if (!errorMessage.value)
          status.value = 'complete'
        break
      }
      if (!value)
        continue

      buffer += value
      const parts = buffer.split(/\r?\n\r?\n/)
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const match = part.match(/data:\s*(\{.*\})/s)
        if (!match?.[1])
          continue
        handleEvent(JSON.parse(match[1]) as SpeedtestEvent)
      }
    }
  }
  catch (error) {
    console.error('Manual speedtest stream failed:', error)
    errorMessage.value = 'The speed test could not finish. Check the Speedtest CLI and network connection, then try again.'
    status.value = 'error'
  }
  finally {
    reader = null
  }
}

onBeforeUnmount(() => {
  void reader?.cancel()
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="font-semibold text-highlighted">
            Run a speedtest
          </h2>
          <p class="mt-1 text-sm text-muted">
            Start a one-off test now. Results are saved to speedtest history.
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <UFormField label="Network interface">
            <USelect
              v-model="selectedInterface"
              :items="interfaceItems"
              aria-label="Network interface for manual speedtest"
              class="w-full sm:min-w-56"
              :disabled="isRunning"
            />
          </UFormField>
          <UButton
            :disabled="isRunning"
            :loading="status === 'initializing'"
            icon="i-lucide-play"
            @click="startTest"
          >
            {{ status === 'complete' || status === 'error' ? 'Run again' : 'Start test' }}
          </UButton>
        </div>
      </div>
    </template>

    <section class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)] lg:items-center">
      <div class="min-w-0">
        <SpeedtestGauge
          :value="activeSpeed"
          :max="gaugeMax"
          :label="status === 'upload' ? 'Upload' : 'Download'"
          :phase="status === 'upload' ? 'upload' : 'download'"
        />

        <div class="mt-2 flex min-h-8 items-center justify-center gap-2" role="status" aria-live="polite">
          <span
            class="size-2.5 rounded-full"
            :class="{
              'bg-neutral-500': status === 'idle',
              'animate-pulse bg-amber-500': status === 'initializing' || status === 'ping',
              'animate-pulse bg-blue-600 dark:bg-blue-400': status === 'download',
              'animate-pulse bg-green-600 dark:bg-green-400': status === 'upload',
              'bg-green-600 dark:bg-green-400': status === 'complete',
              'bg-red-600 dark:bg-red-400': status === 'error',
            }"
          />
          <p class="text-sm font-medium text-toned">
            {{ statusText }}
          </p>
        </div>

        <UProgress
          v-if="isRunning"
          :model-value="progress * 100"
          class="mt-4"
          aria-label="Manual speedtest progress"
        />
        <p v-if="errorMessage" class="mt-4 text-center text-sm text-error" role="alert">
          {{ errorMessage }}
        </p>
      </div>

      <div class="min-w-0">
        <h3 class="mb-2 text-base font-semibold text-highlighted">
          Test metrics
        </h3>
        <dl class="divide-y divide-muted border-y border-default">
          <div class="flex items-center justify-between gap-4 py-3">
            <dt class="text-sm text-muted">
              Download
            </dt>
            <dd class="text-right font-semibold tabular-nums text-blue-700 dark:text-blue-300">
              {{ downloadMeasured ? `${currentDownload.toFixed(2)} Mbps` : '—' }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-3">
            <dt class="text-sm text-muted">
              Upload
            </dt>
            <dd class="text-right font-semibold tabular-nums text-green-700 dark:text-green-300">
              {{ uploadMeasured ? `${currentUpload.toFixed(2)} Mbps` : '—' }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-3">
            <dt class="text-sm text-muted">
              Latency
            </dt>
            <dd class="text-right font-semibold tabular-nums text-default">
              {{ latencyMeasured ? `${latency.toFixed(1)} ms` : '—' }}
            </dd>
          </div>
        </dl>

        <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div class="min-w-0">
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Provider
            </dt>
            <dd class="mt-1 truncate text-default">
              {{ isp || 'Not detected' }}
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Public IP
            </dt>
            <dd class="mt-1 break-all text-default">
              {{ publicIp || '—' }}
            </dd>
          </div>
          <div class="min-w-0 sm:col-span-2">
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Network interface
            </dt>
            <dd class="mt-1 break-all text-default">
              {{ testedInterfaceName || selectedInterfaceLabel }}
            </dd>
          </div>
        </dl>

        <a
          v-if="resultUrl"
          :href="resultUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-4 inline-flex items-center gap-1 text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          View shared result
          <UIcon name="i-lucide-arrow-up-right" aria-hidden="true" />
        </a>
      </div>
    </section>
  </UCard>
</template>
