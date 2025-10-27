<script setup lang="ts">
const host = ref('')
const currentDownload = ref(0)
const currentUpload = ref(0)
const maxDownload = ref(0)
const maxUpload = ref(0)
let source: EventSource | null = null
const timeData = ref<string[]>([])
const inData = ref<number[]>([])
const outData = ref<number[]>([])
const maxData = 50

const option = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    textStyle: { color: '#f8fafc' },
    formatter: (params: any) => {
      const time = params[0].axisValue
      return `
        <div style="font-size: 13px;">
          <b>${time}</b><br/>
          📥 Download: ${params[0].data} MB/s<br/>
          📤 Upload: ${params[1].data} MB/s
        </div>
      `
    },
  },
  legend: {
    data: [
      { name: '📥 Download', icon: 'circle' },
      { name: '📤 Upload', icon: 'circle' },
    ],
    textStyle: { color: '#cbd5e1', fontWeight: '500' },
    top: 10,
  },
  grid: {
    top: 60,
    left: 50,
    right: 20,
    bottom: 40,
  },
  xAxis: {
    type: 'category',
    data: timeData.value,
    axisLine: { lineStyle: { color: '#475569' } },
    axisLabel: { color: '#cbd5e1' },
  },
  yAxis: {
    type: 'value',
    name: 'MB/s',
    nameTextStyle: { color: '#cbd5e1' },
    axisLine: { lineStyle: { color: '#475569' } },
    splitLine: { lineStyle: { color: '#334155' } },
    axisLabel: { color: '#cbd5e1' },
  },
  series: [
    {
      name: '📥 Download',
      data: inData.value,
      type: 'line',
      smooth: true,
      showSymbol: false,
      color: '#3b82f6',
      lineStyle: {
        width: 3,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#60a5fa' },
            { offset: 1, color: '#2563eb' },
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
            { offset: 0, color: 'rgba(59,130,246,0.3)' },
            { offset: 1, color: 'rgba(59,130,246,0)' },
          ],
        },
      },
    },
    {
      name: '📤 Upload',
      data: outData.value,
      type: 'line',
      smooth: true,
      showSymbol: false,
      color: '#f87171',
      lineStyle: {
        width: 3,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#fca5a5' },
            { offset: 1, color: '#ef4444' },
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
            { offset: 0, color: 'rgba(248,113,113,0.3)' },
            { offset: 1, color: 'rgba(248,113,113,0)' },
          ],
        },
      },
    },
  ],
}))

function startStream() {
  if (source)
    source.close()
  timeData.value = []
  inData.value = []
  outData.value = []

  source = new EventSource('/api/bandwidths/stream')
  source.onmessage = (evt) => {
    const data = JSON.parse(evt.data)
    timeData.value.push(new Date(data.timestamp).toLocaleTimeString())
    inData.value.push(data.inMbps)
    outData.value.push(data.outMbps)
    host.value = data.host

    if (timeData.value.length > maxData) {
      timeData.value.shift()
      inData.value.shift()
      outData.value.shift()
    }

    currentDownload.value = data.inMbps.toFixed(2)
    currentUpload.value = data.outMbps.toFixed(2)

    if (data.inMbps > maxDownload.value)
      maxDownload.value = data.inMbps
    if (data.outMbps > maxUpload.value)
      maxUpload.value = data.outMbps
  }

  source.onerror = () => console.warn('SSE disconnected')
}

onMounted(() => startStream())
onBeforeUnmount(() => source?.close())
</script>

<template>
  <u-page>
    <div class="flex items-center justify-center gap-2 mt-2">
      <span class="font-semibold">Host:</span>
      <span class="text-2xl font-bold">{{ host }}</span>
    </div>
    <div class="flex flex-wrap justify-around items-center gap-4 mb-6 text-slate-100">
      <div class="flex items-center gap-2 text-blue-400">
        <span class="text-2xl">📥</span>
        <span class="font-semibold">Download:</span>
        <span class="text-2xl font-bold">{{ currentDownload }}</span>
        <span class="text-slate-400 text-sm">MB/s</span>
      </div>
      <div class="flex items-center gap-2 text-red-400">
        <span class="text-2xl">📤</span>
        <span class="font-semibold">Upload:</span>
        <span class="text-2xl font-bold">{{ currentUpload }}</span>
        <span class="text-slate-400 text-sm">MB/s</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-2xl">🚀</span>
        <span class="font-semibold">Max Speed:</span>
        <span class="text-2xl font-bold text-blue-400">{{ maxDownload }}</span>
        <span class="text-slate-400 text-sm">MB/s</span>
        <span class="text-2xl font-bold text-red-400">{{ maxUpload }}</span>
        <span class="text-slate-400 text-sm">MB/s</span>
      </div>
    </div>
    <VChart
      :option="option"
      autoresize
      style="height: 500px; width: 100%;"
    />
  </u-page>
</template>
