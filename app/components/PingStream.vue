<script setup lang="ts">
interface HostData {
  timestamps: number[]
  latencyData: number[]
  maxLatency: number
  status: 'online' | 'offline' | 'idle'
}

const hosts = ref<Map<string, HostData>>(new Map())
const maxPoints = 60
const theme = useChartTheme()
let eventSource: EventSource | null = null
const colorPalette = [...chartBaseColors].sort(() => Math.random() - 0.5)
// Summary statistics
const summary = computed(() => {
  const hostList = Array.from(hosts.value.values())
  const totalHosts = hostList.length
  const onlineHosts = hostList.filter(h => h.status === 'online').length
  const offlineHosts = hostList.filter(h => h.status === 'offline').length
  const idleHosts = hostList.filter(h => h.status === 'idle').length

  const allLatencies = hostList.flatMap(h => h.latencyData.slice(-1)).filter(l => l > 0)
  const avgLatency = allLatencies.length > 0
    ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
    : 0

  const maxLatency = Math.max(...hostList.map(h => h.maxLatency), 0)

  return {
    totalHosts,
    onlineHosts,
    offlineHosts,
    idleHosts,
    avgLatency,
    maxLatency,
  }
})

const option = computed<ECOption>(() => {
  const chartTheme = theme.value
  const hostList = Array.from(hosts.value.entries())
  if (hostList.length === 0) {
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Waiting for ping data...',
        left: 'center',
        top: 'middle',
        textStyle: { color: chartTheme.textMuted },
      },
    }
  }

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: chartTheme.backgroundElevated,
      borderColor: chartTheme.border,
      textStyle: { color: chartTheme.text },
      formatter(params: any) {
        if (!params || params.length === 0)
          return ''
        const timestamp = params[0].data[0]
        const timeStr = new Date(timestamp).toLocaleTimeString()
        let content = `<div style="font-size:13px; line-height:1.8"><b>${timeStr}</b><br/>`
        params.forEach((param: any) => {
          if (param.data != null) {
            content += `${param.marker} ${param.seriesName}: <b style="color:${param.color}">${param.data[1]} ms</b><br/>`
          }
        })
        content += '</div>'
        return content
      },
    },
    legend: {
      data: hostList.map(([host]) => `🏓 ${host}`),
      textStyle: { color: chartTheme.textMuted, fontWeight: 500 },
      top: 10,
    },
    grid: {
      top: 60,
      left: 50,
      right: 20,
      bottom: 40,
    },
    xAxis: {
      type: 'time',
      axisLine: {
        lineStyle: { color: chartTheme.border },
      },
      axisLabel: {
        color: chartTheme.textMuted,
        fontSize: 11,
        formatter: (value: number) => new Date(value).toLocaleTimeString(),
      },
    },
    yAxis: {
      type: 'value',
      name: 'Latency (ms)',
      nameTextStyle: { color: chartTheme.textToned },
      axisLine: {
        lineStyle: { color: chartTheme.border },
      },
      splitLine: {
        lineStyle: { color: chartTheme.borderMuted },
      },
      axisLabel: { color: chartTheme.textMuted, fontSize: 11 },
    },
    series: hostList.map(([host, data], index) => {
      const colorIndex = index % colorPalette.length
      const colors = colorPalette[colorIndex] ?? colorPalette[0]!

      // Convert to [timestamp, value] pairs for time-based x-axis
      const timeSeriesData = data.timestamps.map((timestamp, i) => [timestamp, data.latencyData[i]])

      return {
        name: `🏓 ${host}`,
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: timeSeriesData,
        lineStyle: {
          width: 3,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: colors.primary },
              { offset: 1, color: colors.secondary },
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
              { offset: 0, color: colors.area },
              {
                offset: 1,
                color: colors.area.replace('0.25', '0'),
              },
            ],
          },
        },
      }
    }),
  }
})

function startStream() {
  if (eventSource)
    eventSource.close()

  hosts.value.clear()

  eventSource = new EventSource('/api/pings/stream')

  eventSource.onmessage = (evt) => {
    const payload = JSON.parse(evt.data)
    const host = payload.host
    const latency = payload.latency ?? 0
    const timestamp = new Date(payload.timestamp).getTime()

    if (!hosts.value.has(host)) {
      hosts.value.set(host, {
        timestamps: [],
        latencyData: [],
        maxLatency: 0,
        status: 'idle',
      })
    }

    const hostData = hosts.value.get(host)!
    hostData.timestamps.push(timestamp)
    hostData.latencyData.push(latency)
    hostData.status = payload.status
    hostData.maxLatency = Math.max(hostData.maxLatency, latency)

    if (hostData.timestamps.length > maxPoints) {
      hostData.timestamps.shift()
      hostData.latencyData.shift()
    }

    // Trigger reactivity
    hosts.value = new Map(hosts.value)
  }

  eventSource.onerror = () => console.warn('SSE disconnected')
}

onMounted(startStream)
onBeforeUnmount(() => eventSource?.close())
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
        Latency Monitor
      </h2>
      <p class="text-sm text-muted">
        Live ping stream visualization - {{ hosts.size }} host{{ hosts.size !== 1 ? 's' : '' }}
      </p>
    </header>

    <!-- Overall Summary -->
    <div v-if="hosts.size > 0" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div class="flex flex-col items-center rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 dark:border-cyan-800 dark:bg-cyan-950/30">
        <span class="mb-1 text-xs font-medium text-muted">Total Hosts</span>
        <span class="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{{ summary.totalHosts }}</span>
      </div>
      <div class="flex flex-col items-center rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
        <span class="mb-1 text-xs font-medium text-muted">Online</span>
        <span class="text-2xl font-bold text-green-700 dark:text-green-300">{{ summary.onlineHosts }}</span>
      </div>
      <div class="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
        <span class="mb-1 text-xs font-medium text-muted">Offline</span>
        <span class="text-2xl font-bold text-red-700 dark:text-red-300">{{ summary.offlineHosts }}</span>
      </div>
      <div class="flex flex-col items-center rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 dark:border-cyan-800 dark:bg-cyan-950/30">
        <span class="mb-1 text-xs font-medium text-muted">Avg Latency</span>
        <span class="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
          {{ summary.avgLatency.toFixed(1) }}<span class="ml-1 text-xs text-dimmed">ms</span>
        </span>
      </div>
      <div class="flex flex-col items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
        <span class="mb-1 text-xs font-medium text-muted">Peak Latency</span>
        <span class="text-2xl font-bold text-amber-800 dark:text-amber-300">
          {{ summary.maxLatency.toFixed(1) }}<span class="ml-1 text-xs text-dimmed">ms</span>
        </span>
      </div>
    </div>

    <!-- Host stats -->
    <div v-if="hosts.size > 0" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="([hostName, hostData], index) in Array.from(hosts.entries())"
        :key="hostName"
        class="flex flex-col rounded-xl border border-default bg-muted px-4 py-3"
      >
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xl">🏓</span>
          <span :style="{ color: (colorPalette[index % colorPalette.length] ?? colorPalette[0]!).primary }" class="truncate text-sm font-semibold text-highlighted" :title="hostName">{{ hostName }}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-muted">Current:</span>
            <span
              class="ml-1 font-bold"
              :class="(hostData.latencyData.at(-1) ?? 0) > 100 || (hostData.latencyData.at(-1) ?? 0) <= 0 ? 'text-red-700 dark:text-red-400' : 'text-cyan-700 dark:text-cyan-300'"
            >
              {{ (hostData.latencyData.at(-1) ?? 0).toFixed(2) }} ms
            </span>
          </div>
          <div>
            <span class="text-muted">Max:</span>
            <span class="ml-1 font-bold text-amber-800 dark:text-amber-300">{{ hostData.maxLatency.toFixed(2) }} ms</span>
          </div>
          <div class="col-span-2">
            <span class="text-muted">Status:</span>
            <span
              class="ml-1 font-bold uppercase"
              :class="hostData.status === 'offline' ? 'text-red-700 dark:text-red-400' : hostData.status === 'online' ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-300'"
            >
              {{ hostData.status }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="rounded-xl border border-default bg-muted p-2 sm:rounded-2xl sm:p-4">
      <VChart :option="option" autoresize :style="{ height: '400px' }" />
    </div>
  </section>
</template>
