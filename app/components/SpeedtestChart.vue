<script setup lang="ts">
interface Props {
  start: string | null
  end: string | null
  networkInterface: string
}

const props = defineProps<Props>()
const theme = useChartTheme()

const { data: chartData, refresh } = await useFetch('/api/speedtest-results/chart', {
  query: {
    start: computed(() => props.start),
    end: computed(() => props.end),
    networkInterface: computed(() => props.networkInterface),
  },
  immediate: true,
})

// Watch for prop changes and refresh
watch(() => [props.start, props.end, props.networkInterface], () => {
  refresh()
}, { deep: true })

const option = computed<ECOption>(() => {
  const chartTheme = theme.value
  if (!chartData.value || chartData.value.length === 0) {
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'No speedtest data available for the selected period',
        left: 'center',
        top: 'middle',
        textStyle: { color: chartTheme.textMuted, fontSize: 14 },
      },
    }
  }

  const groupedData = new Map<string, any[]>()
  for (const item of chartData.value) {
    const interfaceLabel = item.networkInterface || 'Unspecified'
    const rows = groupedData.get(interfaceLabel) ?? []
    rows.push(item)
    groupedData.set(interfaceLabel, rows)
  }

  const palettes = [
    { download: '#3b82f6', upload: '#22c55e', latency: '#f59e0b' },
    { download: '#a78bfa', upload: '#2dd4bf', latency: '#fb7185' },
    { download: '#38bdf8', upload: '#a3e635', latency: '#f97316' },
    { download: '#f472b6', upload: '#34d399', latency: '#facc15' },
  ]
  const series: Record<string, any>[] = []
  const legend: string[] = []
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
  })[character] ?? character)
  const colorWithAlpha = (color: string, alpha: number) => {
    const channels = color.match(/[\da-f]{2}/gi)?.map(channel => Number.parseInt(channel, 16)) ?? [0, 0, 0]
    return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`
  }

  for (const [groupIndex, [interfaceLabel, rows]] of [
    ...groupedData.entries(),
  ].entries()) {
    const colors = palettes[groupIndex % palettes.length]!
    const downloadName = `${interfaceLabel} · Download`
    const uploadName = `${interfaceLabel} · Upload`
    const latencyName = `${interfaceLabel} · Latency`
    legend.push(downloadName, uploadName, latencyName)

    series.push(
      {
        name: downloadName,
        type: 'line',
        yAxisIndex: 0,
        showSymbol: false,
        smooth: true,
        data: rows.map((item: any) => [
          new Date(item.timestamp).getTime(),
          toMbps(item.download),
        ]),
        lineStyle: { width: 3, color: colors.download },
        itemStyle: { color: colors.download },
        areaStyle: {
          color: colorWithAlpha(colors.download, 0.16),
        },
      },
      {
        name: uploadName,
        type: 'line',
        yAxisIndex: 0,
        showSymbol: false,
        smooth: true,
        data: rows.map((item: any) => [
          new Date(item.timestamp).getTime(),
          toMbps(item.upload),
        ]),
        lineStyle: { width: 3, color: colors.upload },
        itemStyle: { color: colors.upload },
        areaStyle: {
          color: colorWithAlpha(colors.upload, 0.12),
        },
      },
      {
        name: latencyName,
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        smooth: true,
        data: rows.map((item: any) => [
          new Date(item.timestamp).getTime(),
          Number(item.latency),
        ]),
        lineStyle: { width: 2, color: colors.latency, type: 'dashed' },
        itemStyle: { color: colors.latency },
      },
    )
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
        const timestamp = params[0].axisValue
        const timeStr = new Date(timestamp).toLocaleString()
        let content = `<div style="font-size:13px; line-height:1.8"><b>${timeStr}</b><br/>`
        params.forEach((param: any) => {
          if (param.data != null) {
            const unit = param.seriesName.includes('Latency')
              ? ' ms'
              : ' Mbps'
            content += `${param.marker} ${escapeHtml(param.seriesName)}: <b style="color:${param.color}">${param.data[1].toFixed(2)}${unit}</b><br/>`
          }
        })
        content += '</div>'
        return content
      },
    },
    legend: {
      data: legend,
      type: 'scroll',
      textStyle: { color: chartTheme.textMuted, fontWeight: 500 },
      top: 10,
    },
    grid: {
      top: 60,
      left: 60,
      right: 80,
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
    yAxis: [
      {
        type: 'value',
        name: 'Speed (Mbps)',
        nameTextStyle: { color: chartTheme.textToned },
        axisLine: {
          lineStyle: { color: chartTheme.border },
        },
        splitLine: {
          lineStyle: { color: chartTheme.borderMuted },
        },
        axisLabel: { color: chartTheme.textMuted, fontSize: 11 },
      },
      {
        type: 'value',
        name: 'Latency (ms)',
        nameTextStyle: { color: chartTheme.textToned },
        axisLine: {
          lineStyle: { color: chartTheme.border },
        },
        splitLine: { show: false },
        axisLabel: { color: chartTheme.textMuted, fontSize: 11 },
      },
    ],
    series,
  }
})
</script>

<template>
  <div class="mb-4 rounded-xl border border-default bg-elevated p-4 shadow-sm">
    <h3 class="mb-3 text-lg font-semibold text-highlighted">
      Speedtest Results Summary
    </h3>
    <VChart :option="option" autoresize :style="{ height: '350px' }" />
  </div>
</template>
