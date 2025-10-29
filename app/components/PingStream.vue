<script setup lang="ts">
const host = ref('')
const timeData = ref<string[]>([])
const latencyData = ref<number[]>([])
const maxLatency = ref(0)
const maxPoints = 60
let eventSource: EventSource | null = null

const currentLatency = computed(() => latencyData.value.at(-1) ?? 0)

const option = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    textStyle: { color: '#f1f5f9' },
    formatter(params: any) {
      const { axisValue, data } = params[0]
      return `
        <div style="font-size:13px; line-height:1.6">
          <b>${axisValue}</b><br/>
          🏓 Latency: <b style="color:#38bdf8">${data} ms</b>
        </div>
      `
    },
  },
  legend: {
    data: ['🏓 Latency'],
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
    name: 'Latency (ms)',
    nameTextStyle: { color: '#cbd5e1' },
    axisLine: { lineStyle: { color: '#475569' } },
    splitLine: { lineStyle: { color: '#334155' } },
    axisLabel: { color: '#cbd5e1', fontSize: 11 },
  },
  series: [
    {
      name: '🏓 Latency',
      type: 'line',
      showSymbol: false,
      smooth: true,
      data: latencyData.value,
      lineStyle: {
        width: 3,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#38bdf8' },
            { offset: 1, color: '#0284c7' },
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
            { offset: 0, color: 'rgba(56,189,248,0.25)' },
            { offset: 1, color: 'rgba(56,189,248,0)' },
          ],
        },
      },
    },
  ],
}))

function startStream() {
  if (eventSource)
    eventSource.close()

  timeData.value = []
  latencyData.value = []
  maxLatency.value = 0

  eventSource = new EventSource('/api/pings/stream')

  eventSource.onmessage = (evt) => {
    const payload = JSON.parse(evt.data)
    const latency = payload.latency ?? 0
    host.value = payload.host
    timeData.value.push(new Date(payload.timestamp).toLocaleTimeString())
    latencyData.value.push(latency)
    if (timeData.value.length > maxPoints) {
      timeData.value.shift()
      latencyData.value.shift()
    }
    maxLatency.value = Math.max(maxLatency.value, latency)
  }

  eventSource.onerror = () => console.warn('SSE disconnected')
}

onMounted(startStream)
onBeforeUnmount(() => eventSource?.close())
</script>

<template>
  <div class="p-4 sm:p-6 bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6">
      <h2 class="text-slate-200 text-2xl sm:text-3xl font-bold tracking-wide mb-1">
        Latency Monitor
      </h2>
      <p class="text-slate-400 text-xs sm:text-sm">
        Live ping stream visualization
      </p>
    </div>

    <!-- Host display -->
    <div class="flex items-center justify-center gap-2 mb-4 sm:mb-6">
      <span class="text-slate-400 font-medium text-sm sm:text-base">Host:</span>
      <span class="text-xl sm:text-2xl font-semibold text-cyan-400 break-all">{{ host }}</span>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
      <div class="flex flex-col items-center bg-slate-800/60 px-3 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl shadow-md border border-slate-700">
        <span class="text-cyan-400 text-2xl sm:text-3xl">🏓</span>
        <span class="text-slate-300 font-semibold mt-1 sm:mt-2 text-xs sm:text-base text-center">Current Latency</span>
        <span class="text-2xl sm:text-3xl font-bold text-cyan-300">
          {{ currentLatency.toFixed(2) }}
          <span class="text-slate-500 text-xs sm:text-sm ml-1">ms</span>
        </span>
      </div>

      <div class="flex flex-col items-center bg-slate-800/60 px-3 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl shadow-md border border-slate-700">
        <span class="text-amber-400 text-2xl sm:text-3xl">⚡</span>
        <span class="text-slate-300 font-semibold mt-1 sm:mt-2 text-xs sm:text-base text-center">Max Latency</span>
        <span class="text-2xl sm:text-3xl font-bold text-amber-300">
          {{ maxLatency.toFixed(2) }}
          <span class="text-slate-500 text-xs sm:text-sm ml-1">ms</span>
        </span>
      </div>
    </div>

    <!-- Chart -->
    <div class="bg-slate-800/50 rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-slate-700 shadow-inner">
      <VChart :option="option" autoresize :style="{ height: '400px' }" />
    </div>
  </div>
</template>
