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
  await navigateTo('/')
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
    await navigateTo('/')
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
          One clear view of your network performance.
        </h1>
        <p class="mt-5 max-w-sm text-base leading-7 text-slate-300">
          Monitor interface throughput, review speed-test results, and check device reachability from one focused console.
        </p>
      </div>

      <div class="relative mt-16 space-y-3" aria-label="Monitoring features">
        <div class="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-400/10 text-green-300">
            <UIcon name="i-lucide-activity" class="size-5" />
          </div>
          <div>
            <p class="text-sm font-medium text-white">
              Bandwidth monitoring
            </p>
            <p class="mt-0.5 text-xs text-slate-400">
              SNMP interface throughput
            </p>
          </div>
        </div>
        <div class="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-400/10 text-green-300">
            <UIcon name="i-lucide-gauge" class="size-5" />
          </div>
          <div>
            <p class="text-sm font-medium text-white">
              Speed-test results
            </p>
            <p class="mt-0.5 text-xs text-slate-400">
              Scheduled tests and history
            </p>
          </div>
        </div>
        <div class="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-400/10 text-green-300">
            <UIcon name="i-lucide-router" class="size-5" />
          </div>
          <div>
            <p class="text-sm font-medium text-white">
              Device status
            </p>
            <p class="mt-0.5 text-xs text-slate-400">
              Reachability at a glance
            </p>
          </div>
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
