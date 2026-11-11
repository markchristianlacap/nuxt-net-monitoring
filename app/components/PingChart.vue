<script setup lang="ts">
interface Props {
  start: string | null
  end: string | null
  status: 'online' | 'offline' | null
}

const props = defineProps<Props>()

const { data: chartData, refresh } = await useFetch('/api/pings/chart', {
  query: {
    start: computed(() => props.start),
    end: computed(() => props.end),
    status: computed(() => props.status),
  },
  immediate: true,
})

// Watch for prop changes and refresh
watch(() => [props.start, props.end, props.status], () => {
  refresh()
}, { deep: true })

const colorPalette = chartBaseColors
const theme = useChartTheme()

const option = computed<ECOption>(() => {
  const chartTheme = theme.value
  if (!chartData.value || chartData.value.length === 0) {
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'No ping data available for the selected period',
        left: 'center',
        top: 'middle',
        textStyle: { color: chartTheme.textMuted, fontSize: 14 },
      },
    }
  }

  // Group data by host
  const hostMap = new Map<string, Array<{ time: number, latency: number, status: string }>>()
  chartData.value.forEach((item: any) => {
    const host = item.host
    const time = new Date(item.time_bucket).getTime()
    const latency = Number(item.avg_latency)
    const status = item.status

    if (!hostMap.has(host)) {
      hostMap.set(host, [])
    }
    hostMap.get(host)!.push({ time, latency, status })
  })

  const hosts = Array.from(hostMap.entries())

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
        const timestamp = params[0].axisValue
        const timeStr = new Date(timestamp).toLocaleString()
        let content = `<div style="font-size:13px; line-height:1.8"><b>${timeStr}</b><br/>`
        params.forEach((param: any) => {
          if (param.data != null) {
            content += `${param.marker} ${param.seriesName}: <b style="color:${param.color}">${param.data[1].toFixed(2)} ms</b><br/>`
          }
        })
        content += '</div>'
        return content
      },
    },
    legend: {
      data: hosts.map(([host]) => host),
      textStyle: { color: chartTheme.textMuted, fontWeight: 500 },
      top: 10,
    },
    grid: {
      top: 60,
      left: 60,
      right: 30,
      bottom: 60,
    },
    xAxis: {
      type: 'time',
      axisLine: {
        lineStyle: { color: chartTheme.border },
      },
      axisLabel: {
        color: chartTheme.textMuted,
        fontSize: 11,
        formatter: (value: number) => {
          const date = new Date(value)
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })
        },
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
    series: hosts.map(([host, data], index) => {
      const colorIndex = index % colorPalette.length
      const colors = colorPalette[colorIndex] ?? colorPalette[0]!

      const timeSeriesData = data.map(point => [point.time, point.latency])

      return {
        name: host,
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: timeSeriesData,
        lineStyle: {
          width: 2,
          color: colors.primary,
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
              { offset: 1, color: 'transparent' },
            ],
          },
        },
      }
    }),
  }
})
</script>

<template>
  <div class="mb-4 rounded-xl border border-default bg-elevated p-4 shadow-sm">
    <h3 class="mb-3 text-lg font-semibold text-highlighted">
      Ping Results Summary
    </h3>
    <VChart :option="option" autoresize :style="{ height: '350px' }" />
  </div>
</template>
