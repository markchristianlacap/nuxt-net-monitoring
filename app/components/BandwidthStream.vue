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
  alias: string
  speed: number
  ip: string
  status: 'up' | 'down' | 'testing' | 'unknown'
}

interface RouterStats {
  host: string
  displayName: string
  gateways: string[]
  interfaces: InterfaceStats[]
}

const interfaceInfo = await useFetch('/api/interfaces')
const gatewayInfo = await useFetch<DeviceGatewayInfo[]>('/api/bandwidths/gateways')
const interfaces = ref<Map<string, InterfaceStats>>(new Map())
const maxPoints = 50
let eventSource: EventSource | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0
let streamActive = false

const colorPalette = [...chartBaseColors].sort(() => Math.random() - 0.5)
const theme = useChartTheme()

const routers = computed<RouterStats[]>(() => {
  const routerMap = new Map<string, RouterStats>()

  for (const stats of interfaces.value.values()) {
    if (!routerMap.has(stats.host)) {
      routerMap.set(stats.host, {
        host: stats.host,
        displayName: stats.displayName,
        gateways: gatewayInfo.data.value?.find(device => device.host === stats.host)?.gateways ?? [],
        interfaces: [],
      })
    }

    routerMap.get(stats.host)!.interfaces.push(stats)
  }

  return Array.from(routerMap.values())
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
})

const summary = computed(() => {
  return {
    routers: routers.value.length,
    interfaces: interfaces.value.size,
  }
})

function getRouterChartOption(router: RouterStats): ECOption {
  const chartTheme = theme.value
  const ifaceList = router.interfaces
  if (ifaceList.length === 0) {
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Waiting for bandwidth data...',
        left: 'center',
        top: 'middle',
        textStyle: { color: chartTheme.textMuted },
      },
    }
  }

  const interfaceLabel = (stats: InterfaceStats) => {
    const alias = stats.alias.trim()
    return alias
      ? `${stats.name} (${alias})`
      : stats.name
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
          content += `${param.marker} ${param.seriesName}: <b style="color:${param.color}">${param.data[1]} Mbps</b><br/>`
        })
        content += '</div>'
        return content
      },
    },
    legend: {
      data: ifaceList.flatMap(stats => [`${interfaceLabel(stats)} Download`, `${interfaceLabel(stats)} Upload`]),
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
      axisLabel: { color: chartTheme.textMuted, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'Mbps',
      nameTextStyle: { color: chartTheme.textToned },
      axisLine: {
        lineStyle: { color: chartTheme.border },
      },
      splitLine: {
        lineStyle: { color: chartTheme.borderMuted },
      },
      axisLabel: { color: chartTheme.textMuted, fontSize: 11 },
    },
    series: ifaceList.flatMap((stats, index) => {
      const colorIndex = index % colorPalette.length
      const colors = colorPalette[colorIndex] ?? colorPalette[0]!
      const inSeries = stats.timestamps.map((t, i) => [t, stats.inData[i]])
      const outSeries = stats.timestamps.map((t, i) => [t, stats.outData[i]])
      return [
        {
          name: `${interfaceLabel(stats)} Download`,
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: inSeries,
          lineStyle: { width: 3, color: colors.primary },
          areaStyle: { color: colors.area },
        },
        {
          name: `${interfaceLabel(stats)} Upload`,
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: outSeries,
          lineStyle: { width: 3, color: colors.secondary },
          areaStyle: {
            color: colors.area.replace('0.25', '0'),
          },
        },
      ]
    }),
  }
}

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
        alias: '',
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
        alias: info.alias || '',
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
  <div class="rounded-2xl border border-default bg-elevated p-4 shadow-sm sm:p-6">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6">
      <h2 class="mb-1 text-2xl font-bold tracking-wide text-highlighted sm:text-3xl">
        Bandwidth Monitor
      </h2>
      <p class="text-xs text-muted sm:text-sm">
        Live throughput monitoring · {{ summary.routers }} {{ summary.routers === 1 ? 'router' : 'routers' }} · {{ summary.interfaces }} {{ summary.interfaces === 1 ? 'interface' : 'interfaces' }}
      </p>
    </div>
    <!-- Router Cards -->
    <div v-if="routers.length > 0" class="grid grid-cols-1 gap-4 2xl:grid-cols-2">
      <UCard v-for="router in routers" :key="router.host" class="h-full">
        <template #header>
          <div class="flex min-w-0 items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate text-base font-semibold text-highlighted">
                {{ router.displayName }}
              </h3>
              <p v-if="router.displayName !== router.host" class="truncate text-xs text-muted">
                {{ router.host }}
              </p>
              <div v-if="router.gateways.length" class="mt-2 flex flex-wrap gap-1.5">
                <span class="text-xs text-muted">Gateways:</span>
                <span
                  v-for="gateway in router.gateways"
                  :key="gateway"
                  class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-toned"
                >
                  {{ gateway }}
                </span>
              </div>
            </div>
            <span class="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-toned">
              {{ router.interfaces.length }} {{ router.interfaces.length === 1 ? 'interface' : 'interfaces' }}
            </span>
          </div>
        </template>

        <div class="divide-y divide-default">
          <section
            v-for="stats in router.interfaces"
            :key="`${stats.host}-${stats.name}`"
            class="py-3 first:pt-0 last:pb-0"
          >
            <div class="mb-2 flex min-w-0 items-center justify-between gap-3">
              <h4 class="truncate text-sm font-semibold text-highlighted">
                {{ stats.alias ? `${stats.name} (${stats.alias})` : stats.name }}
              </h4>
              <span
                :class="{
                  'text-green-700 dark:text-green-400': stats.status === 'up',
                  'text-red-700 dark:text-red-400': stats.status === 'down',
                  'text-muted': stats.status === 'unknown',
                }"
                class="shrink-0 text-xs font-semibold uppercase"
              >
                {{ stats.status }}
              </span>
            </div>
            <dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
              <div class="flex min-w-0 items-baseline justify-between gap-2">
                <dt class="shrink-0 text-muted" title="Download">
                  Down
                </dt>
                <dd class="truncate text-right font-semibold tabular-nums text-blue-700 dark:text-blue-300">
                  {{ stats.currentDownload.toFixed(2) }} Mbps
                </dd>
              </div>
              <div class="flex min-w-0 items-baseline justify-between gap-2">
                <dt class="shrink-0 text-muted" title="Upload">
                  Up
                </dt>
                <dd class="truncate text-right font-semibold tabular-nums text-red-700 dark:text-red-300">
                  {{ stats.currentUpload.toFixed(2) }} Mbps
                </dd>
              </div>
              <div class="flex min-w-0 items-baseline justify-between gap-2">
                <dt class="shrink-0 text-muted" title="Interface speed">
                  Speed
                </dt>
                <dd class="truncate text-right font-semibold tabular-nums text-toned">
                  {{ stats.speed }} Mbps
                </dd>
              </div>
              <div class="flex min-w-0 items-baseline justify-between gap-2">
                <dt class="shrink-0 text-muted" title="IP address">
                  IP
                </dt>
                <dd class="truncate text-right font-semibold text-toned" :title="stats.ip">
                  {{ stats.ip || '—' }}
                </dd>
              </div>
              <div class="flex min-w-0 items-baseline justify-between gap-2">
                <dt class="shrink-0 text-muted" title="Peak download">
                  Peak ↓
                </dt>
                <dd class="truncate text-right font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                  {{ stats.maxDownload.toFixed(2) }} Mbps
                </dd>
              </div>
              <div class="flex min-w-0 items-baseline justify-between gap-2">
                <dt class="shrink-0 text-muted" title="Peak upload">
                  Peak ↑
                </dt>
                <dd class="truncate text-right font-semibold tabular-nums text-red-700 dark:text-red-400">
                  {{ stats.maxUpload.toFixed(2) }} Mbps
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div class="mt-4 rounded-lg border border-default bg-muted p-2 sm:p-3">
          <VChart :option="getRouterChartOption(router)" autoresize :style="{ height: '300px' }" />
        </div>
      </UCard>
    </div>

    <div v-else class="flex min-h-48 items-center justify-center rounded-xl border border-default bg-muted px-4 text-sm text-muted">
      Waiting for bandwidth data...
    </div>
  </div>
</template>
