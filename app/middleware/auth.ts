export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  const status = await $fetch<{ setupRequired: boolean, authenticated: boolean }>('/api/auth/status')
  if (status.setupRequired) {
    return navigateTo('/setup')
  }
  if (!status.authenticated && to.path !== '/login') {
    return navigateTo('/login')
  }
})
