<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <header class="flex flex-col gap-5 border-b border-default pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex min-w-0 items-start gap-3">
      <span class="mt-2 size-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_4px_var(--monitor-signal-soft)]" aria-hidden="true" />
      <div class="min-w-0 space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
          {{ title }}
        </h1>
        <p v-if="description" class="max-w-2xl text-sm text-muted sm:text-base">
          {{ description }}
        </p>
      </div>
    </div>
    <div
      v-if="$slots.actions"
      class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
