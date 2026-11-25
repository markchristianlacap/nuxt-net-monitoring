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
          { label: 'Bandwidth Results', to: '/bandwidths', active: route.path === '/bandwidths' },
        ]
      : []),
    ...(features?.speedtest
      ? [
          { label: 'Speedtest Results', to: '/speedtest-results', active: route.path === '/speedtest-results' },
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
    <UHeader title="Nuxt Net Monitoring" class="border-b border-default bg-default/95">
      <template #right>
        <UNavigationMenu :items="items" class="hidden md:block" />
        <UColorModeSelect size="sm" aria-label="Color theme" />
      </template>
      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>
    <UMain>
      <UContainer class="py-8 sm:py-12">
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>
