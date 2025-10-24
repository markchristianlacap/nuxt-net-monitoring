// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-echarts'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    SNMP_HOST: process.env.NUXT_SNMP_HOST,
    SNMP_COMMUNITY: process.env.NUXT_SNMP_COMMUNITY,
    PING_HOST: process.env.NUXT_PING_HOST
  },

  compatibilityDate: '2025-01-15',
  nitro: {
    rollupConfig: {
      external: ['net-snmp']
    }
  },
  echarts: {
    charts: ['LineChart'],
    components: ['GridComponent', 'TooltipComponent', 'DatasetComponent'],
    renderer: ['canvas']
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
