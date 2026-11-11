<script setup lang="ts">
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const pending = ref(false)

const { data: authStatus } = await useFetch('/api/auth/status')
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
  <div class="mx-auto mt-16 w-full max-w-sm space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">
        Sign in
      </h1>
      <p class="mt-2 text-muted">
        Sign in to manage your network monitoring dashboard.
      </p>
    </div>
    <form class="space-y-4" @submit.prevent="signIn">
      <UFormField label="Username">
        <UInput v-model="username" autocomplete="username" required class="w-full" />
      </UFormField>
      <UFormField label="Password">
        <UInput v-model="password" type="password" autocomplete="current-password" required class="w-full" />
      </UFormField>
      <p v-if="errorMessage" class="text-sm text-error" role="alert">
        {{ errorMessage }}
      </p>
      <UButton type="submit" :loading="pending" block>
        Sign in
      </UButton>
    </form>
  </div>
</template>
