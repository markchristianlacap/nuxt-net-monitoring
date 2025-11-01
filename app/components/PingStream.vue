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

// Color palette for different hosts
const colorPalette = [
  { primary: '#38bdf8', secondary: '#0284c7', area: 'rgba(56,189,248,0.25)' },
  { primary: '#f472b6', secondary: '#db2777', area: 'rgba(244,114,182,0.25)' },
  { primary: '#a78bfa', secondary: '#7c3aed', area: 'rgba(167,139,250,0.25)' },
  { primary: '#34d399', secondary: '#059669', area: 'rgba(52,211,153,0.25)' },
  { primary: '#fbbf24', secondary: '#d97706', area: 'rgba(251,191,36,0.25)' },
]

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

    <!-- Host stats -->
    <div v-if="hosts.size > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
      <div
        v-for="([hostName, hostData], index) in Array.from(hosts.entries())"
        :key="hostName"
        class="flex flex-col bg-slate-800/60 px-4 py-3 rounded-xl shadow-md border border-slate-700"
      >
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xl" :style="{ color: (colorPalette[index % colorPalette.length] ?? colorPalette[0]!).primary }">🏓</span>
          <span class="text-slate-200 font-semibold text-sm truncate" :title="hostName">{{ hostName }}</span>
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
