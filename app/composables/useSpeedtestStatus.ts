export function useSpeedtestStatus() {
  const status = ref<SpeedtestStatus | null>(null)
  const unavailable = ref(false)
  let eventSource: EventSource | null = null

  onMounted(() => {
    eventSource = new EventSource('/api/speedtest/stream')
    eventSource.onopen = () => {
      unavailable.value = false
    }
    eventSource.onmessage = (event) => {
      try {
        status.value = JSON.parse(event.data) as SpeedtestStatus
        unavailable.value = false
      }
      catch {
        unavailable.value = true
      }
    }
    eventSource.onerror = () => {
      unavailable.value = true
    }
  })

  onBeforeUnmount(() => eventSource?.close())

  return { status, unavailable }
}
