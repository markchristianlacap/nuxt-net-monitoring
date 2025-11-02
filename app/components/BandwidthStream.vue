<script setup lang="ts">
import type { InterfaceInfo } from '#shared/types/interface'
import type { BandwidthResult } from '#shared/types/bandwidth'

interface InterfaceData {
  timestamps: string[]
  inData: number[]
  outData: number[]
  currentDownload: number
  currentUpload: number
  maxDownload: number
  maxUpload: number
  interfaceInfo: InterfaceInfo | null
}

const host = ref('')
const interfaces = ref<Map<string, InterfaceData>>(new Map())
const maxData = 50
let source: EventSource | null = null

// Base colors for different interfaces
const baseColors = [
  { in: { primary: '#60a5fa', secondary: '#2563eb', area: 'rgba(59,130,246,0.25)' }, out: { primary: '#fca5a5', secondary: '#ef4444', area: 'rgba(248,113,113,0.25)' } },
  { in: { primary: '#34d399', secondary: '#10b981', area: 'rgba(52,211,153,0.25)' }, out: { primary: '#fbbf24', secondary: '#f59e0b', area: 'rgba(251,191,36,0.25)' } },
  { in: { primary: '#a78bfa', secondary: '#8b5cf6', area: 'rgba(167,139,250,0.25)' }, out: { primary: '#fb923c', secondary: '#f97316', area: 'rgba(251,146,60,0.25)' } },
  { in: { primary: '#2dd4bf', secondary: '#14b8a6', area: 'rgba(45,212,191,0.25)' }, out: { primary: '#f472b6', secondary: '#ec4899', area: 'rgba(244,114,182,0.25)' } },
]

function getColorForIndex(index: number) {
  return baseColors[index % baseColors.length]
}

// Fetch interface info
async function fetchInterfaceInfo() {
  try {
    const response = await fetch('/api/interface-info')
    if (response.ok) {
      const infos: InterfaceInfo[] = await response.json()
      infos.forEach((info) => {
        if (!interfaces.value.has(info.interfaceName)) {
          interfaces.value.set(info.interfaceName, {
            timestamps: [],
            inData: [],
            outData: [],
            currentDownload: 0,
            currentUpload: 0,
            maxDownload: 0,
            maxUpload: 0,
            interfaceInfo: info,
          })
        }
        else {
          const existing = interfaces.value.get(info.interfaceName)!
          existing.interfaceInfo = info
        }
      })
    }
  }
  catch (e) {
    console.error('Failed to fetch interface info:', e)
  }
}

// Get all timestamps (using first interface as reference)
const allTimestamps = computed(() => {
  const first = Array.from(interfaces.value.values())[0]
  return first?.timestamps || []
})

// Calculate total stats across all interfaces
const totalStats = computed(() => {
  let totalDownload = 0
  let totalUpload = 0
  let maxDownload = 0
  let maxUpload = 0

  for (const data of interfaces.value.values()) {
    totalDownload += data.currentDownload
    totalUpload += data.currentUpload
    maxDownload = Math.max(maxDownload, data.maxDownload)
    maxUpload = Math.max(maxUpload, data.maxUpload)
  }

  return { totalDownload, totalUpload, maxDownload, maxUpload }
})

// Compute chart option
const option = computed<ECOption>(() => {
  const series: any[] = []
  const legendData: any[] = []
  let colorIndex = 0

  for (const [interfaceName, data] of interfaces.value.entries()) {
    const colors = getColorForIndex(colorIndex++)
    const displayName = data.interfaceInfo?.interfaceName || interfaceName

    legendData.push({ name: `📥 ${displayName}`, icon: 'circle' })
    legendData.push({ name: `📤 ${displayName}`, icon: 'circle' })

    series.push({
      name: `📥 ${displayName}`,
      data: data.inData,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 2,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: colors.in.primary },
            { offset: 1, color: colors.in.secondary },
          ],
        },
      },
      areaStyle: {
        color: colors.in.area,
      },
    })

    series.push({
      name: `📤 ${displayName}`,
      data: data.outData,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 2,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: colors.out.primary },
            { offset: 1, color: colors.out.secondary },
          ],
        },
      },
      areaStyle: {
        color: colors.out.area,
      },
    })
  }

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' },
    },
    legend: {
      data: legendData,
      textStyle: { color: '#94a3b8', fontWeight: 500 },
      top: 10,
      type: 'scroll',
    },
    grid: { top: interfaces.value.size > 1 ? 80 : 60, left: 50, right: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: allTimestamps.value,
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
    series,
  }
})

function startStream() {
  if (source)
    source.close()

  // Clear all data
  for (const data of interfaces.value.values()) {
    data.timestamps = []
    data.inData = []
    data.outData = []
  }

  source = new EventSource('/api/bandwidths/stream')

  source.onmessage = (evt) => {
    const bandwidth: BandwidthResult = JSON.parse(evt.data)

    const interfaceName = bandwidth.interfaceName || 'default'
    host.value = bandwidth.host

    // Initialize interface data if not exists
    if (!interfaces.value.has(interfaceName)) {
      interfaces.value.set(interfaceName, {
        timestamps: [],
        inData: [],
        outData: [],
        currentDownload: 0,
        currentUpload: 0,
        maxDownload: 0,
        maxUpload: 0,
        interfaceInfo: bandwidth.interfaceInfo || null,
      })
    }

    const data = interfaces.value.get(interfaceName)!

    // Update interface info if available
    if (bandwidth.interfaceInfo && !data.interfaceInfo) {
      data.interfaceInfo = bandwidth.interfaceInfo
    }

    const timestamp = new Date(bandwidth.timestamp).toLocaleTimeString()
    const inMbps = Math.round(bandwidth.inMbps * 100) / 100
    const outMbps = Math.round(bandwidth.outMbps * 100) / 100

    data.timestamps.push(timestamp)
    data.inData.push(inMbps)
    data.outData.push(outMbps)

    if (data.timestamps.length > maxData) {
      data.timestamps.shift()
      data.inData.shift()
      data.outData.shift()
    }

    data.currentDownload = inMbps
    data.currentUpload = outMbps
    data.maxDownload = Math.max(data.maxDownload, inMbps)
    data.maxUpload = Math.max(data.maxUpload, outMbps)
  }

  source.onerror = () => console.warn('SSE disconnected')
}

onMounted(() => {
  fetchInterfaceInfo()
  startStream()
})
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
        Live throughput monitoring - {{ interfaces.size }} interface(s)
      </p>
    </div>

    <!-- Interface Info Cards -->
    <div v-if="interfaces.size > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div
        v-for="([interfaceName, data], index) in Array.from(interfaces.entries())"
        :key="interfaceName"
        class="bg-slate-800/60 p-3 rounded-xl border border-slate-700"
      >
        <div class="flex items-center gap-2 mb-2">
          <div
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: getColorForIndex(index).in.primary }"
          />
          <h3 class="text-slate-300 font-semibold text-sm">
            {{ data.interfaceInfo?.interfaceName || interfaceName }}
          </h3>
        </div>
        <div v-if="data.interfaceInfo" class="grid grid-cols-2 gap-2 text-xs">
          <div v-if="data.interfaceInfo.interfaceIP">
            <span class="text-slate-400">IP:</span>
            <span class="text-green-400 ml-1">{{ data.interfaceInfo.interfaceIP }}</span>
          </div>
          <div>
            <span class="text-slate-400">Status:</span>
            <span :class="data.interfaceInfo.interfaceStatus === 'up' ? 'text-green-400' : 'text-red-400'" class="ml-1">
              {{ data.interfaceInfo.interfaceStatus.toUpperCase() }}
            </span>
          </div>
          <div v-if="data.interfaceInfo.interfaceSpeed">
            <span class="text-slate-400">Speed:</span>
            <span class="text-amber-400 ml-1">{{ (data.interfaceInfo.interfaceSpeed / 1000000).toFixed(0) }} Mbps</span>
          </div>
          <div v-if="data.interfaceInfo.interfaceMAC">
            <span class="text-slate-400">MAC:</span>
            <span class="text-purple-400 ml-1 font-mono text-[10px]">{{ data.interfaceInfo.interfaceMAC }}</span>
          </div>
        </div>
      </div>
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
        <span class="text-slate-300 font-semibold mt-1 sm:mt-2 text-xs sm:text-base text-center">Total Download</span>
        <span class="text-2xl sm:text-3xl font-bold text-blue-300">
          {{ totalStats.totalDownload.toFixed(2) }}
          <span class="text-slate-500 text-xs sm:text-sm ml-1">MB/s</span>
        </span>
      </div>

      <div class="flex flex-col items-center bg-slate-800/60 px-3 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl shadow-md border border-slate-700">
        <span class="text-red-400 text-2xl sm:text-3xl">📤</span>
        <span class="text-slate-300 font-semibold mt-1 sm:mt-2 text-xs sm:text-base text-center">Total Upload</span>
        <span class="text-2xl sm:text-3xl font-bold text-red-300">
          {{ totalStats.totalUpload.toFixed(2) }}
          <span class="text-slate-500 text-xs sm:text-sm ml-1">MB/s</span>
        </span>
      </div>

      <div class="flex flex-col items-center bg-slate-800/60 px-3 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl shadow-md border border-slate-700 col-span-2 lg:col-span-1">
        <span class="text-amber-400 text-2xl sm:text-3xl">🚀</span>
        <span class="text-slate-300 font-semibold mt-1 sm:mt-2 text-xs sm:text-base text-center">Max Speeds</span>
        <div class="flex items-center gap-4 mt-2">
          <div class="flex flex-col items-center">
            <span class="text-blue-300 text-lg sm:text-xl font-bold">{{ totalStats.maxDownload.toFixed(2) }}</span>
            <span class="text-slate-500 text-xs">MB/s</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-red-300 text-lg sm:text-xl font-bold">{{ totalStats.maxUpload.toFixed(2) }}</span>
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
