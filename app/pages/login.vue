<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const pending = ref(false)

const { data: authStatus } = await useFetch('/api/auth/status', {
  credentials: 'same-origin',
})
if (authStatus.value?.setupRequired) {
  await navigateTo('/setup')
}
else if (authStatus.value?.authenticated) {
  await navigateTo('/admin')
}

async function signIn() {
  pending.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
      credentials: 'same-origin',
    })
    await navigateTo('/admin')
  }
  catch (error: any) {
    errorMessage.value = error.data?.statusMessage ?? 'Unable to sign in.'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-default bg-default shadow-xl shadow-slate-950/5 lg:grid-cols-[1.05fr_0.95fr] dark:shadow-black/20">
    <section class="relative hidden overflow-hidden bg-slate-950 px-8 py-10 text-white lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12" aria-label="Network monitoring overview">
      <div class="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div class="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-green-400/10 blur-3xl" />
      <div class="relative">
        <BrandLogo title="Nuxt Net Monitoring" />
        <h1 class="mt-16 max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">
          See the signal behind your network.
        </h1>
        <p class="mt-5 max-w-sm text-base leading-7 text-slate-300">
          A focused control room for bandwidth trends, device health, and internet speed tests.
        </p>
      </div>

      <div class="relative mt-16 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div class="mb-4 flex items-center justify-between text-xs font-medium text-slate-300">
          <span>Network activity</span>
          <span class="inline-flex items-center gap-1.5 text-green-300"><span class="size-1.5 rounded-full bg-green-400" /> Live</span>
        </div>
        <svg class="h-24 w-full" viewBox="0 0 420 96" fill="none" role="img" aria-label="Network activity line visualization">
          <path d="M0 64h38l12-20 14 36 18-56 18 40h30l14-18 17 10 18-30 20 52 16-28 18 14h35l16-18 14 10 15-24 19 42 17-28 18 18h38" stroke="#00DC82" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M0 64h38l12-20 14 36 18-56 18 40h30l14-18 17 10 18-30 20 52 16-28 18 14h35l16-18 14 10 15-24 19 42 17-28 18 18h38V96H0V64Z" fill="url(#activity-fill)" opacity=".18" />
          <defs>
            <linearGradient id="activity-fill" x1="210" y1="8" x2="210" y2="96" gradientUnits="userSpaceOnUse">
              <stop stop-color="#00DC82" />
              <stop offset="1" stop-color="#00DC82" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div class="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
          <span>SNMP interface throughput</span>
          <span>Last 60 sec</span>
        </div>
      </div>
    </section>

    <section class="flex flex-col justify-center px-6 py-10 sm:px-12 sm:py-14" aria-labelledby="sign-in-title">
      <div class="mx-auto w-full max-w-sm">
        <div class="mb-8 lg:hidden">
          <BrandLogo title="Nuxt Net Monitoring" />
        </div>
        <h2 id="sign-in-title" class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
          Welcome back
        </h2>
        <p class="mt-2 text-sm leading-6 text-muted">
          Sign in to open your monitoring console.
        </p>

        <UCard class="mt-8">
          <form class="space-y-5" @submit.prevent="signIn">
            <UFormField label="Username">
              <UInput v-model="username" autocomplete="username" placeholder="Enter your username" required class="w-full" />
            </UFormField>
            <UFormField label="Password">
              <UInput v-model="password" type="password" autocomplete="current-password" placeholder="Enter your password" required class="w-full" />
            </UFormField>
            <p v-if="errorMessage" class="text-sm text-error" role="alert">
              {{ errorMessage }}
            </p>
            <UButton type="submit" :loading="pending" block>
              Sign in to dashboard
            </UButton>
          </form>
        </UCard>
        <p class="mt-6 text-center text-xs text-muted">
          Private monitoring for your network.
        </p>
      </div>
    </section>
  </div>
</template>
