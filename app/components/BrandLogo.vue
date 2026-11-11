<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()
</script>

<template>
  <span class="inline-flex items-center gap-2.5 whitespace-nowrap">
    <svg
      aria-hidden="true"
      class="size-8 shrink-0"
      viewBox="0 0 40 40"
      fill="none"
    >
      <rect x="1" y="1" width="38" height="38" rx="12" fill="#0F172A" stroke="#334155" stroke-width="1.5" />
      <path d="M7 20h5.5l3.2-7.2 5.2 14.4 4.1-9.1h7" stroke="#00DC82" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="7" cy="20" r="1.7" fill="#00DC82" />
      <circle cx="33" cy="18.1" r="1.7" fill="#00DC82" />
    </svg>
    <span class="text-sm font-semibold tracking-tight text-primary sm:text-base">
      {{ title }}
    </span>
  </span>
</template>
