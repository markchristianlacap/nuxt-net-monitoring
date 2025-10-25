<script setup lang="ts">
const inMbps = ref(0)
const outMbps = ref(0)
const maxInMbps = ref(0)
const maxOutMbps = ref(0)
const timestamps = ref<string[]>([])
const inHistory = ref<number[]>([])
const outHistory = ref<number[]>([])
let source: EventSource | null = null

onMounted(() => {
  source = new EventSource('/api/bandwidth/stream')

  source.onmessage = (e) => {
    const data = JSON.parse(e.data)
    console.log(data)
    inMbps.value = data.inMbps
    outMbps.value = data.outMbps
    if (data.inMbps > maxInMbps.value) maxInMbps.value = data.inMbps
    if (data.outMbps > maxOutMbps.value) maxOutMbps.value = data.outMbps
    const timeLabel = new Date(data.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // Keep only the last 60 points (~1 minute)
    if (timestamps.value.length >= 60) {
      timestamps.value.shift()
      inHistory.value.shift()
      outHistory.value.shift()
    }

    timestamps.value.push(timeLabel)
    inHistory.value.push(data.inMbps)
    outHistory.value.push(data.outMbps)
  }
})

onBeforeUnmount(() => {
  if (source) source.close()
})

const chartOptions = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    textStyle: { color: '#f8fafc' }
  },
  legend: {
    data: ['Download (↓)', 'Upload (↑)'],
    textStyle: { color: '#9ca3af' }
  },
  grid: { left: '4%', right: '3%', bottom: '8%', containLabel: true },
  xAxis: {
    type: 'category',
    data: timestamps.value,
    axisLabel: { color: '#9ca3af' },
    boundaryGap: false
  },
  yAxis: {
    type: 'value',
    name: 'Mbps',
    axisLabel: { color: '#9ca3af' },
    splitLine: { lineStyle: { color: '#374151' } }
  },
  series: [
    {
      name: 'Download (↓)',
      type: 'line',
      smooth: true,
      data: inHistory.value,
      lineStyle: { width: 2 },
      color: '#3b82f6', // blue
      showSymbol: false
    },
    {
      name: 'Upload (↑)',
      type: 'line',
      smooth: true,
      data: outHistory.value,
      lineStyle: { width: 2 },
      color: '#10b981', // green
      showSymbol: false
    }
  ]
}))
</script>

<template>
  <div class="p-4 rounded-2xl shadow-md bg-white dark:bg-neutral-900">
    <h2 class="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">
      Real-Time Bandwidth (Mbps)
    </h2>

    <div class="flex gap-8 mb-4 text-xl font-mono">
      <div class="flex items-center gap-2">
        <span class="text-blue-500">↓</span>
        <span>{{ inMbps.toFixed(2) }}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">Mbps</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-green-500">↑</span>
        <span>{{ outMbps.toFixed(2) }}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">Mbps</span>
      </div>
    </div>

    <div class="flex gap-8 mb-4">
      <div class="flex items-center gap-2">
        <span class="text-blue-500">↓</span>
        <span>{{ maxInMbps.toFixed(2) }}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">Mbps</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-green-500">↑</span>
        <span>{{ maxOutMbps.toFixed(2) }}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">Mbps</span>
      </div>
    </div>

    <ClientOnly>
      <VChart
        :option="chartOptions"
        autoresize
        style="height: 300px"
      />
    </ClientOnly>
  </div>
</template>
