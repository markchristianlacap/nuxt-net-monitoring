<script setup lang="ts">
// reactive arrays for time labels & latency values
const timeData = ref<string[]>([])
const latencyData = ref<number[]>([])
const maxPoints = 50

const colorMode = useColorMode()

// Option object for VChart
const option = ref<ECOption>({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    formatter: (params: any) => {
      const p = params[0]
      return `${p.axisValue}<br/>Latency: ${p.data} ms`
    }
  },
  xAxis: {
    type: 'category',
    data: timeData.value,
    axisLabel: { color: '' },
    axisLine: { lineStyle: { color: '' } }
  },
  yAxis: {
    type: 'value',
    name: 'Latency (ms)',
    axisLabel: { color: '' },
    axisLine: { lineStyle: { color: '' } },
    splitLine: { lineStyle: { color: '' } }
  },
  series: [
    {
      name: 'Latency',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: latencyData.value,
      lineStyle: { color: '' },
      label: {
        show: true,
        formatter: (p: any) => {
          if (p.dataIndex === latencyData.value.length - 1) {
            return `${p.data} ms`
          }
          return ''
        },
        color: ''
      }
    }
  ],
  animation: true
})

// Function to update styles/colors based on mode
function applyTheme() {
  const isDark = colorMode.value === 'dark'
  const textColor = isDark ? '#e5e7eb' : '#374151'
  const lineColor = isDark ? '#60a5fa' : '#2563eb'
  const gridColor = isDark ? '#333' : '#ddd'

  option.value.xAxis!.axisLabel!.color = textColor
  option.value.xAxis!.axisLine!.lineStyle!.color = textColor
  option.value.yAxis!.axisLabel!.color = textColor
  option.value.yAxis!.axisLine!.lineStyle!.color = textColor
  option.value.yAxis!.splitLine!.lineStyle!.color = gridColor
  option.value.series![0].lineStyle!.color = lineColor
  option.value.series![0].label!.color = lineColor
}

// SSE and data update logic
let eventSource: EventSource | null = null

function startStream() {
  if (eventSource) eventSource.close()
  timeData.value = []
  latencyData.value = []

  eventSource = new EventSource('/api/ping/stream')
  eventSource.onmessage = (evt) => {
    const payload = JSON.parse(evt.data)
    const now = new Date().toLocaleTimeString()

    timeData.value.push(now)
    latencyData.value.push(payload.latency ?? 0)

    if (timeData.value.length > maxPoints) {
      timeData.value.shift()
      latencyData.value.shift()
    }

    // update the option to trigger re-render
    option.value.xAxis!.data = [...timeData.value]
    option.value.series![0].data = [...latencyData.value]
  }

  eventSource.onerror = () => {
    console.warn('SSE disconnected')
  }
}

onMounted(() => {
  applyTheme()
  startStream()
})

// Watch for color mode changes
watch(() => colorMode.value, () => {
  applyTheme()
})

onBeforeUnmount(() => {
  if (eventSource) eventSource.close()
})
</script>

<template>
  <div class="rounded-xl shadow p-4 bg-background">
    <h2 class="text-xl font-semibold mb-4">
      Real-time Latency Monitor
    </h2>
    <VChart
      :option="option"
      style="height: 320px;"
      autoresize
    />
  </div>
</template>
