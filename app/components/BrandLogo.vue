<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()
</script>

<template>
  <span class="inline-flex items-center gap-2.5 whitespace-nowrap">
    <img src="/logo.svg" alt="" aria-hidden="true" class="size-8 shrink-0">
    <span class="text-sm font-semibold tracking-tight text-primary sm:text-base">
      {{ title }}
    </span>
  </span>
</template>
