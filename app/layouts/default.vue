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
  <UApp>
    <UHeader>
      <template #title>
        <div class="flex items-center space-x-2">
          <span class="text-primary  text-2xl">Nuxt</span>
          <span class="font-normal">Net Monitor</span>
        </div>
      </template>
      <template #right>
        <UNavigationMenu :items="items" class="hidden md:block" />
        <UColorModeSelect size="sm" aria-label="Color theme" />
      </template>
      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" />
      </template>
    </UHeader>
    <UMain>
      <UContainer>
        <slot />
      </UContainer>
    </UMain>
  </UApp>
</template>
