<script setup lang="ts">
interface InterfaceStats {
  host: string
  displayName: string
  timestamps: number[]
  inData: number[]
  outData: number[]
  currentDownload: number
  currentUpload: number
  maxDownload: number
  maxUpload: number
  name: string
  speed: number
  ip: string
  status: 'up' | 'down' | 'testing' | 'unknown'
}

const interfaceInfo = await useFetch('/api/interfaces')
const interfaces = ref<Map<string, InterfaceStats>>(new Map())
const maxPoints = 50
let eventSource: EventSource | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0
let streamActive = false

const colorPalette = [...chartBaseColors].sort(() => Math.random() - 0.5)

function getInterfaceLabel(stats: InterfaceStats) {
  const device = stats.displayName !== stats.host ? `${stats.displayName} (${stats.host})` : stats.host
  return `${device} / ${stats.name}`
}

const summary = computed(() => {
  const ifaceList = Array.from(interfaces.value.values())
  if (ifaceList.length === 0)
    return { total: 0, maxDownload: 0, maxUpload: 0 }

  const total = ifaceList.length
  const maxDownload = Math.max(...ifaceList.map(i => i.maxDownload))
  const maxUpload = Math.max(...ifaceList.map(i => i.maxUpload))
  return { total, maxDownload, maxUpload }
})

const option = computed<ECOption>(() => {
  const ifaceList = Array.from(interfaces.value.entries())
  if (ifaceList.length === 0) {
    return {
      backgroundColor: 'transparent',
      title: { text: 'Waiting for bandwidth data...', left: 'center', top: 'middle', textStyle: { color: '#94a3b8' } },
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
          content += `${param.marker} ${param.seriesName}: <b style="color:${param.color}">${param.data[1]} MB/s</b><br/>`
        })
        content += '</div>'
        return content
      },
    },
    legend: {
      data: ifaceList.flatMap(([, stats]) => [`${getInterfaceLabel(stats)} 📥 Download`, `${getInterfaceLabel(stats)} 📤 Upload`]),
      textStyle: { color: '#94a3b8', fontWeight: 500 },
      top: 10,
    },
    grid: { top: 60, left: 50, right: 20, bottom: 40 },
    xAxis: { type: 'time', axisLine: { lineStyle: { color: '#475569' } } },
    yAxis: {
      type: 'value',
      name: 'MB/s',
      nameTextStyle: { color: '#cbd5e1' },
      axisLine: { lineStyle: { color: '#475569' } },
      splitLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#cbd5e1', fontSize: 11 },
    },
    series: ifaceList.flatMap(([, stats], index) => {
      const colorIndex = index % colorPalette.length
      const colors = colorPalette[colorIndex] ?? colorPalette[0]!
      const inSeries = stats.timestamps.map((t, i) => [t, stats.inData[i]])
      const outSeries = stats.timestamps.map((t, i) => [t, stats.outData[i]])
      return [
        {
          name: `${getInterfaceLabel(stats)} 📥 Download`,
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: inSeries,
          lineStyle: { width: 3, color: colors.primary },
          areaStyle: { color: colors.area },
        },
        {
          name: `${getInterfaceLabel(stats)} 📤 Upload`,
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: outSeries,
          lineStyle: { width: 3, color: colors.secondary },
          areaStyle: { color: colors.area.replace('0.25', '0') },
        },
      ]
    }),
  }
})

function connectStream() {
  if (!streamActive)
    return
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  eventSource?.close()
  eventSource = new EventSource('/api/bandwidths/stream')
  eventSource.onopen = () => {
    reconnectAttempt = 0
  }
  eventSource.onmessage = (evt) => {
    let data: BandwidthResult
    try {
      data = JSON.parse(evt.data)
    }
    catch (error) {
      console.error('Invalid bandwidth stream message:', error)
      return
    }
    const iface = data.interface
    const key = `${data.host}\u0000${iface}`
    if (!interfaces.value.has(key)) {
      const info = interfaceInfo.data.value?.find(i => i.host === data.host && i.name === iface) || {
        host: data.host,
        displayName: data.displayName || data.host,
        name: iface,
        speed: 0,
        ip: '',
        status: 'unknown',
      }
      interfaces.value.set(key, {
        host: data.host,
        displayName: data.displayName || info.displayName || data.host,
        timestamps: [],
        inData: [],
        outData: [],
        currentDownload: 0,
        currentUpload: 0,
        maxDownload: 0,
        maxUpload: 0,
        name: info.name || iface,
        speed: info.speed || 0,
        ip: info.ip || '',
        status: info.status,
      })
    }
    const stats = interfaces.value.get(key)!
    const timestamp = new Date(data.timestamp).getTime()
    const inMbps = Math.round(data.inMbps * 100) / 100
    const outMbps = Math.round(data.outMbps * 100) / 100

    stats.timestamps.push(timestamp)
    stats.inData.push(inMbps)
    stats.outData.push(outMbps)
    stats.currentDownload = inMbps
    stats.currentUpload = outMbps
    stats.maxDownload = Math.max(stats.maxDownload, inMbps)
    stats.maxUpload = Math.max(stats.maxUpload, outMbps)

    if (stats.timestamps.length > maxPoints) {
      stats.timestamps.shift()
      stats.inData.shift()
      stats.outData.shift()
    }
    interfaces.value = new Map(interfaces.value)
  }

  eventSource.onerror = () => {
    eventSource?.close()
    eventSource = null
    if (!streamActive || reconnectTimer)
      return

    const delay = Math.min(1_000 * 2 ** reconnectAttempt, 30_000)
    reconnectAttempt++
    reconnectTimer = setTimeout(connectStream, delay)
  }
}

function startStream() {
  streamActive = true
  connectStream()
}

function reconnectWhenOnline() {
  reconnectAttempt = 0
  connectStream()
}

onMounted(() => {
  startStream()
  window.addEventListener('online', reconnectWhenOnline)
})
onBeforeUnmount(() => {
  streamActive = false
  window.removeEventListener('online', reconnectWhenOnline)
  if (reconnectTimer)
    clearTimeout(reconnectTimer)
  eventSource?.close()
})
</script>

<template>
  <div class="p-4 sm:p-6 bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6">
      <h2 class="text-slate-200 text-2xl sm:text-3xl font-bold tracking-wide mb-1">
        Bandwidth Monitor
      </h2>
      <p class="text-slate-400 text-xs sm:text-sm">
        Live throughput monitoring - {{ summary.total }} interface(s)
      </p>
    </div>
    <!-- Interface Cards -->
    <div v-if="interfaces.size > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
      <div v-for="([key, stats], index) in Array.from(interfaces.entries())" :key="key" class="flex flex-col bg-slate-800/60 px-4 py-3 rounded-xl shadow-md border border-slate-700">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xl">📡</span>
          <div class="min-w-0">
            <span :style="{ color: (colorPalette[index % colorPalette.length] ?? colorPalette[0]!).primary }" class="text-slate-200 font-semibold text-sm truncate">{{ getInterfaceLabel(stats) }}</span>
            <span v-if="stats.displayName !== stats.host" class="block text-slate-500 text-xs truncate">{{ stats.host }}</span>
          </div>
          <span class="text-slate-400 text-xs font-medium">
            Status:
          </span>
          <span
            :class="{
              'text-green-400': stats.status === 'up',
              'text-red-400': stats.status === 'down',
              'text-slate-400': stats.status === 'unknown',
            }" class="text-xs font-semibold uppercase"
          >
            {{ stats.status }}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-slate-400">Speed:</span>
            <span class="ml-1 font-bold text-slate-300">{{ stats.speed }} Mbps</span>
          </div>
          <div>
            <span class="text-slate-400">IP:</span>
            <span class="ml-1 font-bold text-slate-300">{{ stats.ip }}</span>
          </div>
          <div>
            <span class="text-slate-400">Download:</span>
            <span class="ml-1 font-bold text-blue-300">{{ stats.currentDownload.toFixed(2) }} MB/s</span>
          </div>
          <div>
            <span class="text-slate-400">Upload:</span>
            <span class="ml-1 font-bold text-red-300">{{ stats.currentUpload.toFixed(2) }} MB/s</span>
          </div>
          <div>
            <span class="text-slate-400">Max Download:</span>
            <span class="ml-1 font-bold text-blue-400">{{ stats.maxDownload.toFixed(2) }} MB/s</span>
          </div>
          <div>
            <span class="text-slate-400">Max Upload:</span>
            <span class="ml-1 font-bold text-red-400">{{ stats.maxUpload.toFixed(2) }} MB/s</span>
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
