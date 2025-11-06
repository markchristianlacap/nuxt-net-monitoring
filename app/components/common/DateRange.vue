<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, parseAbsolute } from '@internationalized/date'

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:start', value: string | null): void
  (e: 'update:end', value: string | null): void
}>()
const tz = getLocalTimeZone()
const df = new DateFormatter('en-US', { dateStyle: 'medium' })

interface Props {
  start: string | null
  end: string | null
}

const dateRange = ref<any | null>(null)

// Initialize dateRange from props
watchEffect(() => {
  const start = props.start ? parseAbsolute(props.start, tz) : null
  const end = props.end ? parseAbsolute(props.end, tz) : null
  dateRange.value = { start, end } as any
})

// Emit updates when changed
watch(dateRange, () => {
  const start = dateRange.value?.start
    ? new Date(dateRange.value.start.toDate(tz).setHours(0, 0, 0, 0)).toISOString()
    : null
  const end = dateRange.value?.end
    ? new Date(dateRange.value.end.toDate(tz).setHours(23, 59, 59, 999)).toISOString()
    : null

  emit('update:start', start)
  emit('update:end', end)
}, { deep: true })
</script>

<template>
  <UPopover class="flex-1 sm:flex-none">
    <UButton
      color="neutral"
      variant="subtle"
      icon="i-lucide-calendar"
      class="w-full sm:w-auto justify-start"
    >
      <template v-if="dateRange?.start">
        <template v-if="dateRange?.end">
          <span class="hidden sm:inline">
            {{ df.format(dateRange.start.toDate(tz)) }} -
            {{ df.format(dateRange.end.toDate(tz)) }}
          </span>
          <span class="sm:hidden">{{ df.format(dateRange.start.toDate(tz)) }}</span>
        </template>
        <template v-else>
          {{ df.format(dateRange.start.toDate(tz)) }}
        </template>
      </template>
      <template v-else>
        Pick a date
      </template>
    </UButton>

    <template #content>
      <UCalendar v-model="dateRange" :number-of-months="2" range />
    </template>
  </UPopover>
</template>
