<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

const maxPoints = ref(30)
const downloads = ref<number[]>([])
const uploads = ref<number[]>([])
const latency = ref(0)
const isp = ref('')
const publicIp = ref('')
const resultUrl = ref('')
const status = ref<'idle' | 'initializing' | 'ping' | 'download' | 'upload' | 'complete'>('idle')
const progress = ref(0)
let reader: ReadableStreamDefaultReader<string> | null = null

const currentDownload = computed(() => downloads.value.at(-1) || 0)
const currentUpload = computed(() => uploads.value.at(-1) || 0)

function pushData(type: 'download' | 'upload', value: number) {
  const arr = type === 'download' ? downloads.value : uploads.value
  arr.push(value)
  if (arr.length > maxPoints.value)
    arr.shift()
}

function resetState() {
  downloads.value = []
  uploads.value = []
  latency.value = 0
  resultUrl.value = ''
  isp.value = ''
  publicIp.value = ''
  status.value = 'idle'
  progress.value = 0
}

async function startStream() {
  resetState()
  status.value = 'initializing'

  const response = await $fetch<ReadableStream>('/api/speedtest', {
    method: 'POST',
    responseType: 'stream',
  })

  reader = response.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
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
        if (!match)
          continue
        const event = JSON.parse(match[1])
        handleEvent(event)
      }
    }
  }
  catch (err) {
    console.error('Stream error:', err)
    status.value = 'idle'
  }
}

function handleEvent(event: any) {
  switch (event.type) {
    case 'testStart':
      isp.value = event.isp
      publicIp.value = event.interface?.externalIp ?? 'N/A'
      status.value = 'ping'
      break
    case 'ping':
      latency.value = event.ping.latency
      progress.value = event.ping.progress
      break
    case 'download':
      if (progress.value >= 1)
        progress.value = 0
      status.value = 'download'
      pushData('download', toMbps(event.download.bandwidth))
      progress.value = event.download.progress
      break
    case 'upload':
      if (progress.value >= 1)
        progress.value = 0
      status.value = 'upload'
      pushData('upload', toMbps(event.upload.bandwidth))
      progress.value = event.upload.progress
      break
    case 'result':
      latency.value = event.ping.latency
      resultUrl.value = event.result.url
      pushData('download', toMbps(event.download.bandwidth))
      pushData('upload', toMbps(event.upload.bandwidth))
      status.value = 'complete'
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
}[status.value]))

const option = computed(() => ({
  backgroundColor: '#0f172a',
  title: {
    text: 'Speedtest Metrics',
    left: 'center',
    textStyle: { color: '#f1f5f9', fontSize: 16, fontWeight: 600 },
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    textStyle: { color: '#f8fafc' },
    valueFormatter: (v: number) => `${v.toFixed(2)} Mbps`,
  },
  legend: {
    data: ['📥 Download', '📤 Upload'],
    top: 40,
    textStyle: { color: '#e2e8f0', fontWeight: 500 },
  },
  grid: { left: 40, right: 20, bottom: 30, top: 80 },
  xAxis: {
    boundaryGap: false,
    show: false,
    type: 'category',
    data: Array.from({ length: maxPoints.value }, (_, i) => i + 1),
  },
  yAxis: {
    type: 'value',
    name: 'Mbps',
    axisLabel: { color: '#94a3b8' },
    splitLine: { lineStyle: { color: '#334155' } },
  },
  series: [
    {
      name: '📥 Download',
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: '#3b82f6' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59,130,246,0.4)' },
            { offset: 1, color: 'rgba(59,130,246,0.05)' },
          ],
        },
      },
      data: downloads.value,
    },
    {
      name: '📤 Upload',
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: '#10b981' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(16,185,129,0.4)' },
            { offset: 1, color: 'rgba(16,185,129,0.05)' },
          ],
        },
      },
      data: uploads.value,
    },
  ],
}) as ECOption)
</script>

<template>
  <div class="mt-4 sm:mt-6 p-3 sm:p-5 bg-slate-900 rounded-xl shadow-xl">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-5 gap-3">
      <div class="w-full sm:w-auto">
        <p class="text-slate-200 text-base sm:text-lg font-semibold flex flex-wrap items-center gap-2">
          <span class="break-all">{{ isp || 'No ISP Detected' }}</span>
          <u-button
            :disabled="status !== 'idle' && status !== 'complete'"
            size="sm"
            class="sm:ml-3"
            @click="startStream"
          >
            {{ status === 'complete' ? 'Run Again' : 'Start Test' }}
          </u-button>
        </p>
        <p class="text-slate-400 text-xs sm:text-sm mt-1 break-all">
          Public IP: {{ publicIp || 'N/A' }}
        </p>
      </div>
      <div class="text-slate-300 text-sm sm:text-base w-full sm:w-auto text-left sm:text-right">
        Latency: <span class="font-semibold">{{ latency.toFixed(1) }} ms</span>
      </div>
    </div>

    <div class="flex items-center gap-3 mb-4 sm:mb-5">
      <div
        class="w-3 h-3 rounded-full animate-pulse"
        :class="{
          'bg-gray-500': status === 'idle',
          'bg-yellow-500': status === 'initializing',
          'bg-teal-400': status === 'ping',
          'bg-blue-500': status === 'download',
          'bg-green-500': status === 'upload',
          'bg-purple-500': status === 'complete',
        }"
      />
      <p class="text-slate-300 font-medium text-sm sm:text-base">
        {{ statusText }}
      </p>
    </div>

    <div v-if="status !== 'idle'" class="grid grid-cols-3 gap-3 sm:gap-6 text-center mb-4 sm:mb-5">
      <div class="p-3 sm:p-4 bg-slate-800 rounded-lg shadow-inner">
        <p class="text-2xl sm:text-3xl font-bold text-blue-400">
          {{ currentDownload.toFixed(2) }}
        </p>
        <p class="text-slate-400 text-xs sm:text-sm">
          Download (Mbps)
        </p>
      </div>
      <div class="p-3 sm:p-4 bg-slate-800 rounded-lg shadow-inner">
        <p class="text-2xl sm:text-3xl font-bold text-green-400">
          {{ currentUpload.toFixed(2) }}
        </p>
        <p class="text-slate-400 text-xs sm:text-sm">
          Upload (Mbps)
        </p>
      </div>
      <div class="p-3 sm:p-4 bg-slate-800 rounded-lg shadow-inner">
        <p class="text-2xl sm:text-3xl font-bold text-teal-400">
          {{ latency.toFixed(1) }}
        </p>
        <p class="text-slate-400 text-xs sm:text-sm">
          Latency (ms)
        </p>
      </div>
    </div>

    <VChart :option="option" class="h-[300px] sm:h-[420px] w-full" autoresize />

    <u-progress
      v-if="['initializing', 'ping', 'download', 'upload'].includes(status)"
      :model-value="progress * 100"
      class="mt-3 sm:mt-4 rounded-lg"
      height="8"
    />

    <div v-if="status === 'complete'" class="mt-4 sm:mt-5 border-t border-slate-700 pt-4 sm:pt-5 text-slate-300 text-xs sm:text-sm space-y-1">
      <p><span class="text-slate-400">Final Download:</span> {{ currentDownload.toFixed(2) }} Mbps</p>
      <p><span class="text-slate-400">Final Upload:</span> {{ currentUpload.toFixed(2) }} Mbps</p>
      <p><span class="text-slate-400">Latency:</span> {{ latency.toFixed(1) }} ms</p>
      <p v-if="resultUrl" class="break-all">
        <span class="text-slate-400">Result URL:</span>
        <a :href="resultUrl" target="_blank" class="text-blue-400 hover:underline break-all">{{ resultUrl }}</a>
      </p>
    </div>
  </div>
</template>
