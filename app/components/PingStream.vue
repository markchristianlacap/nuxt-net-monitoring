<script setup lang="ts">
interface HostData {
  timestamps: number[]
  latencyData: number[]
  maxLatency: number
  status: 'online' | 'offline' | 'idle'
}

const hosts = ref<Map<string, HostData>>(new Map())
const maxPoints = 60
let eventSource: EventSource | null = null

const baseColors = [
  // 1. Sky Blue
  { primary: '#38bdf8', secondary: '#0369a1', area: 'rgba(56, 189, 248, 0.25)' },
  // 2. Red
  { primary: '#f43f5e', secondary: '#9f1239', area: 'rgba(244, 63, 94, 0.25)' },
  // 3. Green
  { primary: '#22c55e', secondary: '#15803d', area: 'rgba(34, 197, 94, 0.25)' },
  // 4. Amber/Yellow
  { primary: '#f59e0b', secondary: '#b45309', area: 'rgba(245, 158, 11, 0.25)' },
  // 5. Purple
  { primary: '#a855f7', secondary: '#6b21a8', area: 'rgba(168, 85, 247, 0.25)' },
  // 6. Orange
  { primary: '#f97316', secondary: '#c2410c', area: 'rgba(249, 115, 22, 0.25)' },
  // 7. Teal
  { primary: '#14b8a6', secondary: '#0f766e', area: 'rgba(20, 184, 166, 0.25)' },
  // 8. Pink
  { primary: '#ec4899', secondary: '#be185d', area: 'rgba(236, 72, 153, 0.25)' },
  // 9. Lime
  { primary: '#84cc16', secondary: '#4d7c0f', area: 'rgba(132, 204, 22, 0.25)' },
  // 10. Indigo
  { primary: '#6366f1', secondary: '#4338ca', area: 'rgba(99, 102, 241, 0.25)' },
  // 11. Cyan
  { primary: '#06b6d4', secondary: '#0e7490', area: 'rgba(6, 182, 212, 0.25)' },
  // 12. Rose
  { primary: '#fb7185', secondary: '#e11d48', area: 'rgba(251, 113, 133, 0.25)' },
  // 13. Emerald
  { primary: '#10b981', secondary: '#065f46', area: 'rgba(16, 185, 129, 0.25)' },
  // 14. Fuchsia
  { primary: '#d946ef', secondary: '#a21caf', area: 'rgba(217, 70, 239, 0.25)' },
  // 15. True Gray
  { primary: '#64748b', secondary: '#334155', area: 'rgba(100, 116, 139, 0.25)' },
  // 16. Bright Yellow
  { primary: '#eab308', secondary: '#854d0e', area: 'rgba(234, 179, 8, 0.25)' },
  // 17. Violet
  { primary: '#8b5cf6', secondary: '#5b21b6', area: 'rgba(139, 92, 246, 0.25)' },
  // 18. True Red
  { primary: '#ef4444', secondary: '#b91c1c', area: 'rgba(239, 68, 68, 0.25)' },
  // 19. Brown / Ochre
  { primary: '#a16207', secondary: '#78350f', area: 'rgba(161, 98, 7, 0.25)' },
  // 20. Periwinkle
  { primary: '#818cf8', secondary: '#4f46e5', area: 'rgba(129, 140, 248, 0.25)' },
  // 21. Mint
  { primary: '#34d399', secondary: '#047857', area: 'rgba(52, 211, 153, 0.25)' },
  // 22. Dark Orange
  { primary: '#ea580c', secondary: '#9a3412', area: 'rgba(234, 88, 12, 0.25)' },
]
const colorPalette = baseColors.sort(() => Math.random() - 0.5)
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
  const hostList = Array.from(hosts.value.entries())
  if (hostList.length === 0) {
    return {
      backgroundColor: 'transparent',
      title: { text: 'Waiting for ping data...', left: 'center', top: 'middle', textStyle: { color: '#94a3b8' } },
    }
  }

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' },
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
      textStyle: { color: '#94a3b8', fontWeight: 500 },
      top: 10,
    },
    grid: { top: 60, left: 50, right: 20, bottom: 40 },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: {
        color: '#cbd5e1',
        fontSize: 11,
        formatter: (value: number) => new Date(value).toLocaleTimeString(),
      },
    },
    yAxis: {
      type: 'value',
      name: 'Latency (ms)',
      nameTextStyle: { color: '#cbd5e1' },
      axisLine: { lineStyle: { color: '#475569' } },
      splitLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#cbd5e1', fontSize: 11 },
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
              { offset: 1, color: colors.area.replace('0.25', '0') },
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
  <div class="p-4 sm:p-6 bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6">
      <h2 class="text-slate-200 text-2xl sm:text-3xl font-bold tracking-wide mb-1">
        Latency Monitor
      </h2>
      <p class="text-slate-400 text-xs sm:text-sm">
        Live ping stream visualization - {{ hosts.size }} host{{ hosts.size !== 1 ? 's' : '' }}
      </p>
    </div>

    <!-- Overall Summary -->
    <div v-if="hosts.size > 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      <div class="flex flex-col items-center bg-gradient-to-br from-slate-800/80 to-slate-800/40 px-4 py-3 rounded-xl shadow-md border border-slate-600/50">
        <span class="text-slate-400 text-xs font-medium mb-1">Total Hosts</span>
        <span class="text-2xl font-bold text-cyan-300">{{ summary.totalHosts }}</span>
      </div>
      <div class="flex flex-col items-center bg-gradient-to-br from-green-900/30 to-slate-800/40 px-4 py-3 rounded-xl shadow-md border border-green-700/50">
        <span class="text-slate-400 text-xs font-medium mb-1">Online</span>
        <span class="text-2xl font-bold text-green-400">{{ summary.onlineHosts }}</span>
      </div>
      <div class="flex flex-col items-center bg-gradient-to-br from-red-900/30 to-slate-800/40 px-4 py-3 rounded-xl shadow-md border border-red-700/50">
        <span class="text-slate-400 text-xs font-medium mb-1">Offline</span>
        <span class="text-2xl font-bold text-red-400">{{ summary.offlineHosts }}</span>
      </div>
      <div class="flex flex-col items-center bg-gradient-to-br from-slate-800/80 to-slate-800/40 px-4 py-3 rounded-xl shadow-md border border-slate-600/50">
        <span class="text-slate-400 text-xs font-medium mb-1">Avg Latency</span>
        <span class="text-2xl font-bold text-cyan-300">
          {{ summary.avgLatency.toFixed(1) }}<span class="text-xs text-slate-500 ml-1">ms</span>
        </span>
      </div>
      <div class="flex flex-col items-center bg-gradient-to-br from-amber-900/30 to-slate-800/40 px-4 py-3 rounded-xl shadow-md border border-amber-700/50">
        <span class="text-slate-400 text-xs font-medium mb-1">Peak Latency</span>
        <span class="text-2xl font-bold text-amber-300">
          {{ summary.maxLatency.toFixed(1) }}<span class="text-xs text-slate-500 ml-1">ms</span>
        </span>
      </div>
    </div>

    <!-- Host stats -->
    <div v-if="hosts.size > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
      <div
        v-for="([hostName, hostData], index) in Array.from(hosts.entries())"
        :key="hostName"
        class="flex flex-col bg-slate-800/60 px-4 py-3 rounded-xl shadow-md border border-slate-700"
      >
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xl">🏓</span>
          <span :style="{ color: (colorPalette[index % colorPalette.length] ?? colorPalette[0]!).primary }" class="text-slate-200 font-semibold text-sm truncate" :title="hostName">{{ hostName }}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-slate-400">Current:</span>
            <span
              class="ml-1 font-bold"
              :class="(hostData.latencyData.at(-1) ?? 0) > 100 || (hostData.latencyData.at(-1) ?? 0) <= 0 ? 'text-red-400' : 'text-cyan-300'"
            >
              {{ (hostData.latencyData.at(-1) ?? 0).toFixed(2) }} ms
            </span>
          </div>
          <div>
            <span class="text-slate-400">Max:</span>
            <span class="ml-1 font-bold text-amber-300">{{ hostData.maxLatency.toFixed(2) }} ms</span>
          </div>
          <div class="col-span-2">
            <span class="text-slate-400">Status:</span>
            <span
              class="ml-1 font-bold uppercase"
              :class="hostData.status === 'offline' ? 'text-red-400' : hostData.status === 'online' ? 'text-green-400' : 'text-blue-300'"
            >
              {{ hostData.status }}
            </span>
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
