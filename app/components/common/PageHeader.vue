<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <header class="flex flex-col gap-4 border-b border-default pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0 space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
        {{ title }}
      </h1>
      <p v-if="description" class="max-w-2xl text-sm text-muted sm:text-base">
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
