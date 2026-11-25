<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const sidebarOpen = ref(true)
const { data: featureData } = await useFetch<{ features: { bandwidth: boolean, speedtest: boolean } }>('/api/features', {
  key: 'app-features',
})

const items = computed<NavigationMenuItem[]>(() => {
  const features = featureData.value?.features
  const navigation: NavigationMenuItem[] = [
    {
      label: 'Overview',
      icon: 'i-lucide-layout-dashboard',
      to: '/',
      active: route.path === '/',
    },
  ]

  if (features?.bandwidth) {
    navigation.push({
      label: 'Bandwidth history',
      icon: 'i-lucide-activity',
      to: '/bandwidths',
      active: route.path.startsWith('/bandwidths'),
    })
  }
  if (features?.speedtest) {
    navigation.push({
      label: 'Speedtest results',
      icon: 'i-lucide-gauge',
      to: '/speedtest-results',
      active: route.path.startsWith('/speedtest-results'),
    })
  }

  return navigation
})

const systemItems: NavigationMenuItem[] = [
  {
    label: 'Settings',
    icon: 'i-lucide-settings-2',
    to: '/admin',
    active: route.path.startsWith('/admin'),
  },
]
</script>

<template>
  <div class="flex min-h-screen bg-muted/30">
    <USidebar
      v-model:open="sidebarOpen"
      collapsible="icon"
      variant="sidebar"
      :ui="{
        container: 'bg-elevated',
        inner: 'divide-default',
        body: 'gap-6 px-3 py-5',
        header: 'min-h-20 px-4',
      }"
    >
      <template #header>
        <NuxtLink to="/" class="flex min-w-0 items-center gap-3" aria-label="NetScope overview">
          <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm shadow-primary/25">
            <UIcon name="i-lucide-radar" class="size-5" />
          </span>
          <span class="min-w-0 leading-tight group-data-[state=collapsed]/sidebar:hidden">
            <span class="block truncate text-sm font-bold tracking-tight text-highlighted">NetScope</span>
            <span class="block truncate text-[11px] font-medium text-muted">Network observability</span>
          </span>
        </NuxtLink>
      </template>

      <template #default>
        <div class="space-y-2">
          <p class="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-dimmed group-data-[state=collapsed]/sidebar:hidden">
            Workspace
          </p>
          <UNavigationMenu :items="items" orientation="vertical" :ui="{ link: 'py-2.5' }" />
        </div>
        <div class="mt-auto space-y-2">
          <p class="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-dimmed group-data-[state=collapsed]/sidebar:hidden">
            Administration
          </p>
          <UNavigationMenu :items="systemItems" orientation="vertical" :ui="{ link: 'py-2.5' }" />
        </div>
      </template>

      <template #footer>
        <div class="flex items-center gap-3 overflow-hidden rounded-lg bg-muted/60 px-3 py-2.5">
          <span class="relative grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            IT
            <span class="absolute bottom-0 right-0 size-2 rounded-full border-2 border-elevated bg-success" />
          </span>
          <span class="min-w-0 group-data-[state=collapsed]/sidebar:hidden">
            <span class="block truncate text-xs font-semibold text-highlighted">Monitoring team</span>
            <span class="block truncate text-[11px] text-muted">System online</span>
          </span>
        </div>
      </template>
    </USidebar>

    <div class="flex min-h-screen flex-col lg:peer-data-[variant=sidebar]:ms-0">
      <header class="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-default bg-default/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-panel-left"
            color="neutral"
            variant="ghost"
            aria-label="Toggle navigation"
            @click="sidebarOpen = !sidebarOpen"
          />
          <div class="hidden items-center gap-2 text-sm sm:flex">
            <span class="text-muted">Workspace</span>
            <UIcon name="i-lucide-chevron-right" class="size-3.5 text-dimmed" />
            <span class="font-medium text-highlighted">{{ route.path === '/' ? 'Overview' : (route.meta.title || 'Monitoring') }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="hidden items-center gap-2 rounded-full border border-success/20 bg-success/5 px-3 py-1.5 text-xs font-medium text-success sm:flex">
            <span class="size-1.5 animate-pulse rounded-full bg-success" />
            All systems operational
          </div>
          <UColorModeButton color="neutral" variant="ghost" />
        </div>
      </header>
      <UMain class="flex-1">
        <UContainer class="max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <slot />
        </UContainer>
      </UMain>
    </div>
  </div>
</template>
