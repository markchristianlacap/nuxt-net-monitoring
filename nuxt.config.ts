// https://nuxt.com/docs/api/configuration/nuxt-config
import process from 'node:process'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-echarts',
  ],
  devtools: {
    enabled: true,
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    SNMP_HOST: process.env.NUXT_SNMP_HOST,
    SNMP_COMMUNITY: process.env.NUXT_SNMP_COMMUNITY,
    PING_HOST: process.env.NUXT_PING_HOST,
    DB_HOST: process.env.NUXT_DB_HOST,
    DB_USER: process.env.NUXT_DB_USER,
    DB_PASSWORD: process.env.NUXT_DB_PASSWORD,
    DB_NAME: process.env.NUXT_DB_NAME,
    DB_PORT: process.env.NUXT_DB_PORT,
  },
  compatibilityDate: '2025-01-15',
  nitro: {
    rollupConfig: {
      external: ['net-snmp'],
    },
  },
  echarts: {
    charts: ['LineChart'],
    components: ['GridComponent', 'TooltipComponent', 'DatasetComponent'],
    renderer: ['canvas'],
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
})
