<script setup lang="ts">
const host = ref('')
const currentDownload = ref(0)
const currentUpload = ref(0)
const maxDownload = ref(0)
const maxUpload = ref(0)
const timeData = ref<string[]>([])
const inData = ref<number[]>([])
const outData = ref<number[]>([])
const maxData = 50
let source: EventSource | null = null

const option = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    textStyle: { color: '#f1f5f9' },
    formatter(params: any) {
      const time = params[0].axisValue
      return `
        <div style="font-size:13px; line-height:1.6">
          <b>${time}</b><br/>
          📥 Download: <b style="color:#60a5fa">${params[0].data} MB/s</b><br/>
          📤 Upload: <b style="color:#fca5a5">${params[1].data} MB/s</b>
        </div>
      `
    },
  },
  legend: {
    data: [
      { name: '📥 Download', icon: 'circle' },
      { name: '📤 Upload', icon: 'circle' },
    ],
    textStyle: { color: '#94a3b8', fontWeight: 500 },
    top: 10,
  },
  grid: { top: 60, left: 50, right: 20, bottom: 40 },
  xAxis: {
    type: 'category',
    data: timeData.value,
    axisLine: { lineStyle: { color: '#475569' } },
    axisLabel: { color: '#cbd5e1', fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    name: 'MB/s',
    nameTextStyle: { color: '#cbd5e1' },
    axisLine: { lineStyle: { color: '#475569' } },
    splitLine: { lineStyle: { color: '#334155' } },
    axisLabel: { color: '#cbd5e1', fontSize: 11 },
  },
  series: [
    {
      name: '📥 Download',
      data: inData.value,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 3,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#60a5fa' },
            { offset: 1, color: '#2563eb' },
          ],
        },
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59,130,246,0.25)' },
            { offset: 1, color: 'rgba(59,130,246,0)' },
          ],
        },
      },
    },
    {
      name: '📤 Upload',
      data: outData.value,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 3,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#fca5a5' },
            { offset: 1, color: '#ef4444' },
          ],
        },
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(248,113,113,0.25)' },
            { offset: 1, color: 'rgba(248,113,113,0)' },
          ],
        },
      },
    },
  ],
}))

function startStream() {
  if (source)
    source.close()

  timeData.value = []
  inData.value = []
  outData.value = []
  source = new EventSource('/api/bandwidths/stream')

  source.onmessage = (evt) => {
    const data = JSON.parse(evt.data)
    timeData.value.push(new Date(data.timestamp).toLocaleTimeString())
    inData.value.push(data.inMbps)
    outData.value.push(data.outMbps)
    host.value = data.host

    if (timeData.value.length > maxData) {
      timeData.value.shift()
      inData.value.shift()
      outData.value.shift()
    }

    currentDownload.value = data.inMbps.toFixed(2)
    currentUpload.value = data.outMbps.toFixed(2)
    maxDownload.value = Math.max(maxDownload.value, data.inMbps)
    maxUpload.value = Math.max(maxUpload.value, data.outMbps)
  }

  source.onerror = () => console.warn('SSE disconnected')
}

onMounted(startStream)
onBeforeUnmount(() => source?.close())
</script>

<template>
  <div class="p-4 sm:p-6 bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6">
      <h2 class="text-slate-200 text-2xl sm:text-3xl font-bold tracking-wide mb-1">
        Bandwidth Monitor
      </h2>
      <p class="text-slate-400 text-xs sm:text-sm">
        Live throughput monitoring
      </p>
    </div>

    <!-- Host -->
    <div class="flex items-center justify-center gap-2 mb-4 sm:mb-6">
      <span class="text-slate-400 font-medium text-sm sm:text-base">Host:</span>
      <span class="text-xl sm:text-2xl font-semibold text-blue-400 break-all">{{ host }}</span>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
      <div class="flex flex-col items-center bg-slate-800/60 px-3 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl shadow-md border border-slate-700">
        <span class="text-blue-400 text-2xl sm:text-3xl">📥</span>
        <span class="text-slate-300 font-semibold mt-1 sm:mt-2 text-xs sm:text-base text-center">Current Download</span>
        <span class="text-2xl sm:text-3xl font-bold text-blue-300">
          {{ currentDownload }}
          <span class="text-slate-500 text-xs sm:text-sm ml-1">MB/s</span>
        </span>
      </div>

      <div class="flex flex-col items-center bg-slate-800/60 px-3 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl shadow-md border border-slate-700">
        <span class="text-red-400 text-2xl sm:text-3xl">📤</span>
        <span class="text-slate-300 font-semibold mt-1 sm:mt-2 text-xs sm:text-base text-center">Current Upload</span>
        <span class="text-2xl sm:text-3xl font-bold text-red-300">
          {{ currentUpload }}
          <span class="text-slate-500 text-xs sm:text-sm ml-1">MB/s</span>
        </span>
      </div>

      <div class="flex flex-col items-center bg-slate-800/60 px-3 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl shadow-md border border-slate-700 col-span-2 lg:col-span-1">
        <span class="text-amber-400 text-2xl sm:text-3xl">🚀</span>
        <span class="text-slate-300 font-semibold mt-1 sm:mt-2 text-xs sm:text-base text-center">Max Speeds</span>
        <div class="flex items-center gap-4 mt-2">
          <div class="flex flex-col items-center">
            <span class="text-blue-300 text-lg sm:text-xl font-bold">{{ maxDownload.toFixed(2) }}</span>
            <span class="text-slate-500 text-xs">MB/s</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-red-300 text-lg sm:text-xl font-bold">{{ maxUpload.toFixed(2) }}</span>
            <span class="text-slate-500 text-xs">MB/s</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="bg-slate-800/50 rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-slate-700 shadow-inner">
      <VChart :option="option" autoresize :style="{ height: '400px' }" />
    </div>
  </div>
</template>
