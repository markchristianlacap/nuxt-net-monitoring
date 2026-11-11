<script setup lang="ts">
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
      body: { username: username.value, password: password.value },
    })
    await navigateTo('/admin')
  }
  catch (error: any) {
    if (error.statusCode === 409 || error.data?.statusCode === 409) {
      await navigateTo('/login')
      return
    }
    errorMessage.value = error.data?.statusMessage ?? 'Unable to complete setup.'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-md space-y-6 py-8 sm:py-12">
    <CommonPageHeader
      title="Set up your administrator account"
      description="Create the first admin account. Keep this app on a trusted network until setup is complete."
    />
    <p v-if="statusError" class="text-sm text-error" role="alert">
      Unable to check setup status. Verify the database connection and run database migrations, then reload this page.
    </p>
    <UCard>
      <form class="space-y-4" @submit.prevent="createAdmin">
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
        <UButton type="submit" :loading="pending" :disabled="!!statusError || !authStatus?.setupRequired" block>
          Create administrator
        </UButton>
      </form>
    </UCard>
  </div>
</template>
