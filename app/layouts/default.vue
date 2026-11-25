<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { data: featureData } = await useFetch<{ features: { bandwidth: boolean, speedtest: boolean } }>('/api/features', {
  key: 'app-features',
})

const items = computed<NavigationMenuItem[]>(() => {
  const features = featureData.value?.features
  return [
    ...(features?.speedtest
      ? [
          { label: 'Speed Tests', to: '/speedtest-results', active: route.path === '/speedtest-results' },
        ]
      : []),
    ...(features?.bandwidth
      ? [
          { label: 'Bandwidth', to: '/bandwidths', active: route.path === '/bandwidths' },
        ]
      : []),
    {
      label: 'Settings',
      to: '/admin',
      active: route.path.startsWith('/admin'),
    },
  ]
})
</script>

<template>
  <UApp>
    <a href="#main-content" class="skip-link">
      Skip to main content
    </a>
    <UHeader>
      <template #title>
        <div class="flex items-center gap-2.5">
          <span class="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-inverted shadow-sm" aria-hidden="true">
            N
          </span>
          <span class="text-base font-semibold tracking-tight text-highlighted sm:text-lg">
            Nuxt Net Monitor
          </span>
        </div>
      </template>
      <template #right>
        <nav aria-label="Primary navigation" class="hidden md:block">
          <UNavigationMenu :items="items" />
        </nav>
        <UColorModeSelect size="sm" aria-label="Color theme" />
      </template>
      <template #body>
        <nav aria-label="Mobile navigation">
          <UNavigationMenu :items="items" orientation="vertical" />
        </nav>
      </template>
    </UHeader>
    <UMain id="main-content" class="app-main">
      <UContainer class="py-6 sm:py-8 lg:py-10">
        <slot />
      </UContainer>
    </UMain>
  </UApp>
</template>
