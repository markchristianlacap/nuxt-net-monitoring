<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { data: featureData } = await useFetch<{ features: { bandwidth: boolean, speedtest: boolean } }>('/api/features', {
  key: 'app-features',
})

const items = computed<NavigationMenuItem[]>(() => {
  const features = featureData.value?.features
  return [
    ...(features?.bandwidth
      ? [
          { label: 'Bandwidth', to: '/bandwidths', active: route.path === '/bandwidths' },
        ]
      : []),
    ...(features?.speedtest
      ? [
          { label: 'Speed Tests', to: '/speedtest-results', active: route.path === '/speedtest-results' },
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
  <div>
    <UHeader title="Nuxt Net Monitoring">
      <template #right>
        <UNavigationMenu :items="items" class="hidden md:block" />
        <UColorModeSelect size="sm" aria-label="Color theme" />
      </template>
      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>
    <UMain>
      <UContainer class="py-6 sm:py-8">
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>
