<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const title = 'Nuxt Net Monitoring'
const description = 'Nuxt Net Monitoring - Real-time Latency Monitor, PfSense, and Bandwidth Monitor'

const route = useRoute()
const isAuthPage = computed(() => ['/login', '/setup'].includes(route.path))
const { data: featureData } = await useFetch<{ features: { ping: boolean, bandwidth: boolean, speedtest: boolean } }>('/api/features', {
  key: 'app-features',
})

const items = computed<NavigationMenuItem[]>(() => {
  const features = featureData.value?.features
  return [
    ...(features?.ping
      ? [
          { label: 'Ping Results', to: '/pings', active: route.path === '/pings' },
        ]
      : []),
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
useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterCard: 'summary_large_image',
})
useHead({
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
  ],
})
</script>

<template>
  <UApp>
    <UHeader :title="title" :toggle="!isAuthPage">
      <template #title>
        <BrandLogo :title="title" />
      </template>
      <template v-if="!isAuthPage" #right>
        <UNavigationMenu :items="items" class="hidden md:block" />
        <UColorModeSelect size="sm" aria-label="Color theme" />
      </template>
      <template v-if="!isAuthPage" #body>
        <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>
    <UMain>
      <UContainer class="py-6 sm:py-8">
        <NuxtPage />
      </UContainer>
    </UMain>
  </UApp>
</template>
