<script setup lang="ts">
interface Props {
  start: string | null
  end: string | null
  isDownloading: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:start': [value: string | null]
  'update:end': [value: string | null]
  'download': []
}>()
</script>

<template>
  <div class="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
    <slot name="filter" />
    <CommonDateRange
      :start="props.start"
      :end="props.end"
      @update:start="emit('update:start', $event)"
      @update:end="emit('update:end', $event)"
    />
    <UButton
      color="neutral"
      variant="subtle"
      icon="i-lucide-download"
      class="w-full justify-start sm:w-auto sm:justify-center"
      :loading="isDownloading"
      :disabled="isDownloading"
      @click="emit('download')"
    >
      Export CSV
    </UButton>
  </div>
</template>
