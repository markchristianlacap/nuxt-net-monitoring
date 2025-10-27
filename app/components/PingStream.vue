<script setup lang="ts">
const host = ref('')
const timeData = ref<string[]>([])
const latencyData = ref<number[]>([])
const maxPoints = 60
const maxLatency = ref(0)
let eventSource: EventSource | null = null

const currentLatency = computed(() => latencyData.value.at(-1) ?? 0)

const option = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    textStyle: { color: '#f8fafc' },
    formatter(params: any) {
      const time = params[0].axisValue
      const value = params[0].data
      return `
        <div style="font-size:13px">
          <b>${time}</b><br/>
          🏓 Latency: ${value} ms
        </div>
      `
    },
  },
  legend: {
    data: ['🏓 Latency'],
    textStyle: { color: '#cbd5e1', fontWeight: '500' },
    top: 10,
  },
  grid: { top: 60, left: 50, right: 20, bottom: 40 },
  xAxis: {
    type: 'category',
    data: timeData.value,
    axisLine: { lineStyle: { color: '#475569' } },
    axisLabel: { color: '#cbd5e1' },
  },
  yAxis: {
    type: 'value',
    name: 'Latency (ms)',
    nameTextStyle: { color: '#cbd5e1' },
    axisLine: { lineStyle: { color: '#475569' } },
    splitLine: { lineStyle: { color: '#334155' } },
    axisLabel: { color: '#cbd5e1' },
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
    if (latency > maxLatency.value)
      maxLatency.value = latency
  }

  eventSource.onerror = () => console.warn('SSE disconnected')
}

onMounted(() => startStream())
onBeforeUnmount(() => eventSource?.close())
</script>

<template>
  <div>
    <div class="flex items-center justify-center gap-2 mt-2">
      <span class="font-semibold">Host:</span>
      <span class="text-2xl font-bold">{{ host }}</span>
    </div>
    <!-- Header Stats -->
    <div class="flex flex-wrap justify-center md:justify-around items-center gap-4 mb-6 text-slate-100">
      <div class="flex items-center gap-2 text-cyan-400">
        <span class="text-2xl">🏓</span>
        <span class="font-semibold">Current:</span>
        <span class="text-2xl font-bold">{{ currentLatency.toFixed(2) }}</span>
        <span class="text-slate-400 text-sm">ms</span>
      </div>
      <div class="flex items-center gap-2 text-amber-400">
        <span class="text-2xl">⚡</span>
        <span class="font-semibold">Max:</span>
        <span class="text-2xl font-bold">{{ maxLatency.toFixed(2) }}</span>
        <span class="text-slate-400 text-sm">ms</span>
      </div>
    </div>

    <!-- Chart -->
    <VChart
      :option="option"
      autoresize
      style="height: 500px; width: 100%;"
    />
  </div>
</template>
