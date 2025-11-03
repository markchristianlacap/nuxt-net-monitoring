<script setup lang="ts">
interface Props {
  start: string | null
  end: string | null
}

const props = defineProps<Props>()

const { data: chartData, refresh } = await useFetch('/api/speedtest-results/chart', {
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

const option = computed<ECOption>(() => {
  if (!chartData.value || chartData.value.length === 0) {
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'No speedtest data available for the selected period',
        left: 'center',
        top: 'middle',
        textStyle: { color: '#94a3b8', fontSize: 14 },
      },
    }
  }

  const downloadData = chartData.value.map((item: any) => [
    new Date(item.timestamp).getTime(),
    toMbps(item.download),
  ])

  const uploadData = chartData.value.map((item: any) => [
    new Date(item.timestamp).getTime(),
    toMbps(item.upload),
  ])

  const latencyData = chartData.value.map((item: any) => [
    new Date(item.timestamp).getTime(),
    Number(item.latency),
  ])

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
            const unit = param.seriesName.includes('Latency') ? ' ms' : ' Mbps'
            content += `${param.marker} ${param.seriesName}: <b style="color:${param.color}">${param.data[1].toFixed(2)}${unit}</b><br/>`
          }
        })
        content += '</div>'
        return content
      },
    },
    legend: {
      data: ['Download', 'Upload', 'Latency'],
      textStyle: { color: '#94a3b8', fontWeight: 500 },
      top: 10,
    },
    grid: { top: 60, left: 60, right: 80, bottom: 60 },
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
    yAxis: [
      {
        type: 'value',
        name: 'Speed (Mbps)',
        nameTextStyle: { color: '#cbd5e1' },
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 },
      },
      {
        type: 'value',
        name: 'Latency (ms)',
        nameTextStyle: { color: '#cbd5e1' },
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { show: false },
        axisLabel: { color: '#cbd5e1', fontSize: 11 },
      },
    ],
    series: [
      {
        name: 'Download',
        type: 'line',
        yAxisIndex: 0,
        showSymbol: true,
        symbolSize: 8,
        smooth: true,
        data: downloadData,
        lineStyle: {
          width: 3,
          color: '#3b82f6',
        },
        itemStyle: {
          color: '#3b82f6',
        },
        areaStyle: {
          color: 'rgba(59, 130, 246, 0.2)',
        },
      },
      {
        name: 'Upload',
        type: 'line',
        yAxisIndex: 0,
        showSymbol: true,
        symbolSize: 8,
        smooth: true,
        data: uploadData,
        lineStyle: {
          width: 3,
          color: '#22c55e',
        },
        itemStyle: {
          color: '#22c55e',
        },
        areaStyle: {
          color: 'rgba(34, 197, 94, 0.2)',
        },
      },
      {
        name: 'Latency',
        type: 'line',
        yAxisIndex: 1,
        showSymbol: true,
        symbolSize: 6,
        smooth: true,
        data: latencyData,
        lineStyle: {
          width: 2,
          color: '#f59e0b',
          type: 'dashed',
        },
        itemStyle: {
          color: '#f59e0b',
        },
      },
    ],
  }
})
</script>

<template>
  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700 shadow-inner mb-4">
    <h3 class="text-lg font-semibold text-slate-200 mb-3">
      Speedtest Results Summary
    </h3>
    <VChart :option="option" autoresize :style="{ height: '350px' }" />
  </div>
</template>
