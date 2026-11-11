<script setup lang="ts">
interface Props {
  value: number
  max: number
  label: string
  phase: 'download' | 'upload'
}

const props = defineProps<Props>()
const arcLength = Math.PI * 96
const ratio = computed(() => Math.min(Math.max(props.value / Math.max(props.max, 1), 0), 1))
const dashOffset = computed(() => arcLength * (1 - ratio.value))
const strokeColor = computed(() => props.phase === 'upload'
  ? '#4ade80'
  : '#60a5fa')
const tickMarks = computed(() => Array.from({ length: 11 }, (_, index) => {
  const angle = Math.PI - (Math.PI * index) / 10
  const outerRadius = 108
  const innerRadius = index % 5 === 0
    ? 98
    : 102
  return {
    x1: 120 + outerRadius * Math.cos(angle),
    y1: 126 - outerRadius * Math.sin(angle),
    x2: 120 + innerRadius * Math.cos(angle),
    y2: 126 - innerRadius * Math.sin(angle),
  }
}))
</script>

<template>
  <div class="mx-auto w-full max-w-[28rem]" role="img" :aria-label="`${label}: ${value.toFixed(1)} megabits per second`">
    <svg viewBox="0 0 240 172" class="h-auto w-full overflow-visible" aria-hidden="true">
      <path
        d="M 24 126 A 96 96 0 0 1 216 126"
        fill="none"
        stroke="#334155"
        stroke-width="13"
        stroke-linecap="round"
      />
      <line
        v-for="(tick, index) in tickMarks"
        :key="index"
        :x1="tick.x1"
        :y1="tick.y1"
        :x2="tick.x2"
        :y2="tick.y2"
        stroke="#64748b"
        :stroke-width="index % 5 === 0 ? 2 : 1.25"
        stroke-linecap="round"
      />
      <path
        d="M 24 126 A 96 96 0 0 1 216 126"
        fill="none"
        :stroke="strokeColor"
        stroke-width="13"
        stroke-linecap="round"
        :stroke-dasharray="arcLength"
        :stroke-dashoffset="dashOffset"
        class="transition-[stroke-dashoffset] duration-200 ease-out"
      />
      <text x="120" y="105" text-anchor="middle" class="fill-white text-[38px] font-semibold tabular-nums">
        {{ value.toFixed(1) }}
      </text>
      <text x="120" y="128" text-anchor="middle" class="fill-slate-400 text-[11px] font-medium tracking-[0.16em] uppercase">
        Mbps · {{ label }}
      </text>
      <text x="24" y="158" text-anchor="start" class="fill-slate-500 text-[10px] tabular-nums">
        0
      </text>
      <text x="216" y="158" text-anchor="end" class="fill-slate-500 text-[10px] tabular-nums">
        {{ Math.round(max).toLocaleString() }}
      </text>
    </svg>
  </div>
</template>
