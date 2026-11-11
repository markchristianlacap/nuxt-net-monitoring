<script setup lang="ts">
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
const selectedInterface = ref<string | undefined>(undefined)
const testedInterfaceName = ref('')
const status = ref<'idle' | 'initializing' | 'ping' | 'download' | 'upload' | 'complete' | 'error'>('idle')
const progress = ref(0)
let reader: ReadableStreamDefaultReader<string> | null = null
const { data: availableInterfaces } = await useFetch<Array<{ name: string, addresses: string[] }>>('/api/speedtest/interfaces')
const interfaceItems = computed(() => [
  ...(availableInterfaces.value ?? []).map(item => ({
    label: `${item.name} · ${item.addresses.join(', ')}`,
    value: item.name,
  })),
])
const selectedInterfaceLabel = computed(() => selectedInterface.value ?? 'System default')

const activeSpeed = computed(() => status.value === 'upload'
  ? currentUpload.value
  : currentDownload.value)
const gaugeMax = computed(() => {
  const peak = Math.max(100, peakSpeed.value)
  const increment = 10 ** Math.floor(Math.log10(peak)) / 2
  return Math.ceil(peak / increment) * increment
})

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
  status.value = 'idle'
  progress.value = 0
}

async function startStream() {
  resetState()
  status.value = 'initializing'

  try {
    const response = await $fetch<ReadableStream>('/api/speedtest', {
      method: 'POST',
      body: { interfaceName: selectedInterface.value },
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
      const parts = buffer.split(/\n\n/)
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const match = part.match(/data:\s*(\{.*\})/s)
        if (!match || !match[1])
          continue
        const event = JSON.parse(match[1])
        handleEvent(event)
      }
    }
  }
  catch (err) {
    console.error('Stream error:', err)
    errorMessage.value = 'The speed test could not finish. Check the Speedtest CLI and network connection, then try again.'
    status.value = 'error'
  }
}

function handleEvent(event: any) {
  switch (event.type) {
    case 'testStart':
      isp.value = event.isp
      publicIp.value = event.interface?.externalIp ?? 'N/A'
      testedInterfaceName.value = event.interface?.name || selectedInterfaceLabel.value
      status.value = 'ping'
      break
    case 'ping':
      latency.value = event.ping.latency
      latencyMeasured.value = true
      progress.value = event.ping.progress
      break
    case 'download':
      if (progress.value >= 1)
        progress.value = 0
      status.value = 'download'
      updateSpeed('download', event.download.bandwidth)
      progress.value = event.download.progress
      break
    case 'upload':
      if (progress.value >= 1)
        progress.value = 0
      status.value = 'upload'
      updateSpeed('upload', event.upload.bandwidth)
      progress.value = event.upload.progress
      break
    case 'result':
      latency.value = event.ping.latency
      latencyMeasured.value = true
      resultUrl.value = event.result.url
      testedInterfaceName.value = event.interface?.name || testedInterfaceName.value || selectedInterfaceLabel.value
      updateSpeed('download', event.download.bandwidth)
      updateSpeed('upload', event.upload.bandwidth)
      status.value = 'complete'
      break
    case 'error':
      errorMessage.value = event.message || 'The speed test failed. Try another interface or use the system default.'
      status.value = 'error'
      break
  }
}

onUnmounted(() => reader?.cancel())

const statusText = computed(() => ({
  idle: 'Ready to Start',
  initializing: 'Initializing Test...',
  ping: 'Measuring Latency...',
  download: 'Measuring Download Speed...',
  upload: 'Measuring Upload Speed...',
  complete: 'Test Complete',
  error: 'Test Failed',
}[status.value]))
</script>

<template>
  <main class="mx-auto mt-4 w-full max-w-5xl space-y-5 pb-8 sm:mt-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Internet speed test
        </h1>
        <p class="mt-1 text-sm text-slate-400">
          Measure your connection in real time.
        </p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <USelect
          v-model="selectedInterface"
          :items="interfaceItems"
          placeholder="System default"
          aria-label="Network interface"
          :disabled="['initializing', 'ping', 'download', 'upload'].includes(status)"
          size="lg"
          class="w-full sm:min-w-64"
        />
        <UButton
          :disabled="['initializing', 'ping', 'download', 'upload'].includes(status)"
          size="lg"
          icon="i-lucide-play"
          @click="startStream"
        >
          {{ status === 'complete' || status === 'error' ? 'Run again' : 'Start test' }}
        </UButton>
      </div>
    </header>

    <section class="grid gap-8 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)] lg:gap-10">
      <div class="min-w-0">
        <SpeedtestGauge
          :value="activeSpeed"
          :max="gaugeMax"
          :label="status === 'upload' ? 'Upload' : 'Download'"
          :phase="status === 'upload' ? 'upload' : 'download'"
        />

        <div class="mt-2 flex min-h-8 items-center justify-center gap-2" role="status" aria-live="polite">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :class="{
              'bg-slate-500': status === 'idle',
              'animate-pulse bg-amber-400': status === 'initializing' || status === 'ping',
              'animate-pulse bg-blue-400': status === 'download',
              'animate-pulse bg-green-400': status === 'upload',
              'bg-green-400': status === 'complete',
              'bg-red-400': status === 'error',
            }"
          />
          <p class="text-sm font-medium text-slate-200">
            {{ statusText }}
          </p>
        </div>

        <UProgress
          v-if="['initializing', 'ping', 'download', 'upload'].includes(status)"
          :model-value="progress * 100"
          class="mt-4"
        />
        <p v-if="errorMessage" class="mt-4 text-center text-sm text-red-300" role="alert">
          {{ errorMessage }}
        </p>
      </div>

      <div class="min-w-0 self-center">
        <h2 class="mb-2 text-base font-semibold text-slate-100">
          Test metrics
        </h2>
        <dl class="divide-y divide-slate-800 border-y border-slate-800">
          <div class="flex items-center justify-between gap-4 py-4">
            <dt class="text-sm text-slate-400">
              Download
            </dt>
            <dd class="text-right text-lg font-semibold tabular-nums text-blue-300">
              {{ downloadMeasured ? `${currentDownload.toFixed(2)} Mbps` : '—' }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-4">
            <dt class="text-sm text-slate-400">
              Upload
            </dt>
            <dd class="text-right text-lg font-semibold tabular-nums text-green-300">
              {{ uploadMeasured ? `${currentUpload.toFixed(2)} Mbps` : '—' }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-4">
            <dt class="text-sm text-slate-400">
              Latency
            </dt>
            <dd class="text-right text-lg font-semibold tabular-nums text-slate-100">
              {{ latencyMeasured ? `${latency.toFixed(1)} ms` : '—' }}
            </dd>
          </div>
        </dl>

        <div class="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
          <p class="min-w-0 text-slate-400">
            <span class="block text-xs uppercase tracking-wide text-slate-500">Provider</span>
            <span class="mt-1 block truncate text-slate-200">{{ isp || 'Not detected' }}</span>
          </p>
          <p class="min-w-0 text-slate-400">
            <span class="block text-xs uppercase tracking-wide text-slate-500">Public IP</span>
            <span class="mt-1 block break-all text-slate-200">{{ publicIp || '—' }}</span>
          </p>
          <p class="min-w-0 text-slate-400 sm:col-span-2 lg:col-span-1">
            <span class="block text-xs uppercase tracking-wide text-slate-500">Network interface</span>
            <span class="mt-1 block break-all text-slate-200">{{ testedInterfaceName || selectedInterfaceLabel }}</span>
          </p>
        </div>

        <a
          v-if="resultUrl"
          :href="resultUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-5 inline-flex items-center gap-1 text-sm text-blue-300 underline decoration-blue-300/40 underline-offset-4 hover:text-blue-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
        >
          View shared result
          <UIcon name="i-lucide-arrow-up-right" aria-hidden="true" />
        </a>
      </div>
    </section>
  </main>
</template>
