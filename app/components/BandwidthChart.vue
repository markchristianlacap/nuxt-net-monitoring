<script setup lang="ts">
interface Props {
  start: string | null
  end: string | null
  host: string
}

const props = defineProps<Props>()

const { data: chartData, refresh } = await useFetch('/api/bandwidths/chart', {
  query: {
    start: computed(() => props.start),
    end: computed(() => props.end),
    host: computed(() => props.host),
  },
  immediate: true,
})
const { data: interfaceInfo } = await useFetch<DeviceInterface[]>('/api/interfaces')

// Watch for prop changes and refresh
watch(() => [props.start, props.end, props.host], () => {
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
        text: 'No bandwidth data available for the selected period',
        left: 'center',
        top: 'middle',
        textStyle: { color: chartTheme.textMuted, fontSize: 14 },
      },
    }
  }

  // Group by device host and interface so duplicate interface names stay distinct.
  const interfaceMap = new Map<string, { label: string, legendLabel: string, data: Array<{ time: number, download: number, upload: number }> }>()
  chartData.value.forEach((item: any) => {
    const key = `${item.host}\u0000${item.interface}`
    const deviceLabel = item.displayName && item.displayName !== item.host
      ? `${item.displayName} (${item.host})`
      : item.host
    const compactDeviceLabel = item.displayName && item.displayName !== item.host
      ? item.displayName
      : item.host
    const interfaceName = item.interface || item.host
    const alias = interfaceInfo.value?.find(i => i.host === item.host && i.name === item.interface)?.alias?.trim()
    const interfaceLabel = alias
      ? `${interfaceName} (${alias})`
      : interfaceName
    const label = `${deviceLabel} / ${interfaceLabel}`
    const legendLabel = `${compactDeviceLabel} / ${interfaceLabel}`
    const time = new Date(item.time_bucket).getTime()
    const download = Number(item.avg_download)
    const upload = Number(item.avg_upload)

    if (!interfaceMap.has(key)) {
      interfaceMap.set(key, { label, legendLabel, data: [] })
    }
    interfaceMap.get(key)!.data.push({ time, download, upload })
  })

  const interfaces = Array.from(interfaceMap.values())
  const legendLabels = new Map<string, string>()
  const legendData = interfaces.flatMap(({ label, legendLabel }) => {
    const downloadName = `${label} · Download`
    const uploadName = `${label} · Upload`
    legendLabels.set(downloadName, `${legendLabel} · Down`)
    legendLabels.set(uploadName, `${legendLabel} · Up`)
    return [downloadName, uploadName]
  })

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
            content += `${param.marker} ${param.seriesName}: <b style="color:${param.color}">${param.data[1].toFixed(2)} Mbps</b><br/>`
          }
        })
        content += '</div>'
        return content
      },
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      data: legendData,
      formatter(name: string) {
        return legendLabels.get(name) ?? name
      },
      left: 60,
      right: 30,
      top: 8,
      height: 44,
      itemGap: 10,
      itemWidth: 14,
      itemHeight: 10,
      pageButtonPosition: 'end',
      pageIconSize: 12,
      pageIconColor: chartTheme.textToned,
      pageIconInactiveColor: chartTheme.border,
      pageTextStyle: { color: chartTheme.textMuted, fontSize: 11 },
      textStyle: { color: chartTheme.textMuted, fontSize: 11, fontWeight: 500 },
    },
    grid: {
      top: 78,
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
    series: interfaces.flatMap(({ label, data }, index) => {
      const colorIndex = index % colorPalette.length
      const colors = colorPalette[colorIndex] ?? colorPalette[0]!

      const downloadData = data.map(point => [point.time, point.download])
      const uploadData = data.map(point => [point.time, point.upload])

      return [
        {
          name: `${label} · Download`,
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: downloadData,
          lineStyle: {
            width: 2,
            color: colors.primary,
          },
          areaStyle: {
            color: colors.area,
          },
        },
        {
          name: `${label} · Upload`,
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: uploadData,
          lineStyle: {
            width: 2,
            color: colors.secondary,
          },
          areaStyle: {
            color: colors.area.replace('0.25', '0'),
          },
        },
      ]
    }),
  }
})
</script>

<template>
  <div class="mb-4 rounded-xl border border-default bg-elevated p-4 shadow-sm">
    <h3 class="mb-3 text-lg font-semibold text-highlighted">
      Bandwidth Summary
    </h3>
    <VChart :option="option" autoresize :style="{ height: '350px' }" />
  </div>
</template>
