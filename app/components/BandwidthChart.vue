<script setup lang="ts">
interface Props {
  start: string | null
  end: string | null
}

const props = defineProps<Props>()

const { data: chartData, refresh } = await useFetch('/api/bandwidths/chart', {
  query: {
    start: computed(() => props.start),
    end: computed(() => props.end),
  },
  immediate: true,
})

// Watch for prop changes and refresh
watch(() => [props.start, props.end], () => {
  refresh()
}, { deep: true })

const colorPalette = chartBaseColors

const option = computed<ECOption>(() => {
  if (!chartData.value || chartData.value.length === 0) {
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'No bandwidth data available for the selected period',
        left: 'center',
        top: 'middle',
        textStyle: { color: '#94a3b8', fontSize: 14 },
      },
    }
  }

  // Group data by interface
  const interfaceMap = new Map<string, Array<{ time: number, download: number, upload: number }>>()
  chartData.value.forEach((item: any) => {
    const iface = item.interface || item.host
    const time = new Date(item.time_bucket).getTime()
    const download = Number(item.avg_download)
    const upload = Number(item.avg_upload)

    if (!interfaceMap.has(iface)) {
      interfaceMap.set(iface, [])
    }
    interfaceMap.get(iface)!.push({ time, download, upload })
  })

  const interfaces = Array.from(interfaceMap.entries())

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
      data: interfaces.flatMap(([iface]) => [`${iface} 📥 Download`, `${iface} 📤 Upload`]),
      textStyle: { color: '#94a3b8', fontWeight: 500 },
      top: 10,
    },
    grid: { top: 60, left: 60, right: 30, bottom: 60 },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: {
        color: '#cbd5e1',
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
      nameTextStyle: { color: '#cbd5e1' },
      axisLine: { lineStyle: { color: '#475569' } },
      splitLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#cbd5e1', fontSize: 11 },
    },
    series: interfaces.flatMap(([iface, data], index) => {
      const colorIndex = index % colorPalette.length
      const colors = colorPalette[colorIndex] ?? colorPalette[0]!

      const downloadData = data.map(point => [point.time, point.download])
      const uploadData = data.map(point => [point.time, point.upload])

      return [
        {
          name: `${iface} 📥 Download`,
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
          name: `${iface} 📤 Upload`,
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: uploadData,
          lineStyle: {
            width: 2,
            color: colors.secondary,
          },
          areaStyle: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
        },
      ]
    }),
  }
})
</script>

<template>
  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700 shadow-inner mb-4">
    <h3 class="text-lg font-semibold text-slate-200 mb-3">
      Bandwidth Summary
    </h3>
    <VChart :option="option" autoresize :style="{ height: '350px' }" />
  </div>
</template>
