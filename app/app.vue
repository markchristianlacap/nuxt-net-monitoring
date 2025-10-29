<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const title = 'Nuxt Net Monitoring'
const description = 'Nuxt Net Monitoring - Real-time Latency Monitor, PfSense, and Bandwidth Monitor'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Ping Results',
    to: '/pings',
    active: route.path === '/pings',
  },
  {
    label: 'Bandwidth Results',
    to: '/bandwidths',
    active: route.path === '/bandwidths',
  },
  {
    label: 'Speedtest Results',
    to: '/speedtest-results',
    active: route.path === '/speedtest-results',
  },
])
useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #title>
        <div class="text-primary">
          {{ title }}
        </div>
      </template>
      <template #right>
        <UNavigationMenu :items="items" class="hidden md:block" />
        <u-button
          color="primary"
          icon="i-lucide-play"
          @click="navigateTo('/speedtest')"
        >
          <span class="hidden sm:inline">Run Speedtest</span>
          <span class="sm:hidden">Test</span>
        </u-button>
      </template>
      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>
    <UMain>
      <UPage class="w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 h-full mt-5">
        <NuxtPage />
      </UPage>
    </UMain>
  </UApp>
</template>
