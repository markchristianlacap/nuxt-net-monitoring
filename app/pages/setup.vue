<script setup lang="ts">
const token = ref('')
const username = ref('admin')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const pending = ref(false)

const { data: authStatus, error: statusError } = await useFetch('/api/auth/status')
if (authStatus.value && !authStatus.value.setupRequired) {
  await navigateTo(authStatus.value?.authenticated ? '/admin' : '/login')
}

async function createAdmin() {
  errorMessage.value = ''
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  pending.value = true
  try {
    await $fetch('/api/auth/setup', {
      method: 'POST',
      body: { token: token.value, username: username.value, password: password.value },
    })
    await navigateTo('/admin')
  }
  catch (error: any) {
    errorMessage.value = error.data?.statusMessage ?? 'Unable to complete setup.'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto mt-12 w-full max-w-lg space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">
        Set up your administrator account
      </h1>
      <p class="mt-2 text-muted">
        Enter the one-time setup token configured by your deployment administrator.
      </p>
      <p v-if="!authStatus?.setupEnabled" class="mt-3 text-sm text-error" role="alert">
        Admin setup is not enabled. Set NUXT_ADMIN_SETUP_TOKEN in the server environment, then reload this page.
      </p>
      <p v-if="statusError" class="mt-3 text-sm text-error" role="alert">
        Unable to check setup status. Verify the database connection and run database migrations, then reload this page.
      </p>
    </div>
    <form class="space-y-4" @submit.prevent="createAdmin">
      <UFormField label="One-time setup token">
        <UInput v-model="token" type="password" autocomplete="off" required class="w-full" />
      </UFormField>
      <UFormField label="Username" help="3–64 letters, numbers, dots, underscores, or hyphens">
        <UInput v-model="username" autocomplete="username" minlength="3" maxlength="64" required class="w-full" />
      </UFormField>
      <UFormField label="Password" help="Use at least 12 characters.">
        <UInput v-model="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required class="w-full" />
      </UFormField>
      <UFormField label="Confirm password">
        <UInput v-model="confirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" required class="w-full" />
      </UFormField>
      <p v-if="errorMessage" class="text-sm text-error" role="alert">
        {{ errorMessage }}
      </p>
      <UButton type="submit" :loading="pending" :disabled="!!statusError || !authStatus?.setupEnabled" block>
        Create administrator
      </UButton>
    </form>
  </div>
</template>
