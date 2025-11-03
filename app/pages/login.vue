<script setup lang="ts">
const { signIn } = useAuth()

definePageMeta({
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/',
  },
  layout: false,
})

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = 'Please enter both username and password'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await signIn('credentials', {
      username: username.value,
      password: password.value,
      redirect: false,
    })

    if (result?.error) {
      error.value = 'Invalid username or password'
    }
    else {
      // Redirect to home page
      await navigateTo('/')
    }
  }
  catch (e) {
    error.value = 'An error occurred during login'
    console.error('Login error:', e)
  }
  finally {
    loading.value = false
  }
}

useSeoMeta({
  title: 'Login - Nuxt Net Monitoring',
  description: 'Login to access the Nuxt Net Monitoring dashboard',
})
</script>

<template>
  <UApp>
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <UCard class="w-full max-w-md">
        <template #header>
          <div class="text-center">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
              Nuxt Net Monitoring
            </h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to your account
            </p>
          </div>
        </template>

        <form class="space-y-6" @submit.prevent="handleLogin">
          <UFormGroup label="Username" name="username" required>
            <UInput
              v-model="username"
              type="text"
              placeholder="Enter your username"
              autocomplete="username"
              :disabled="loading"
              size="lg"
            />
          </UFormGroup>

          <UFormGroup label="Password" name="password" required>
            <UInput
              v-model="password"
              type="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              :disabled="loading"
              size="lg"
            />
          </UFormGroup>

          <UAlert
            v-if="error"
            color="red"
            variant="soft"
            :title="error"
            :close-button="{ icon: 'i-lucide-x', color: 'red', variant: 'link' }"
            @close="error = ''"
          />

          <UButton
            type="submit"
            color="primary"
            size="lg"
            block
            :loading="loading"
            :disabled="loading"
          >
            Sign In
          </UButton>
        </form>

        <template #footer>
          <div class="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Use your admin credentials to sign in</p>
          </div>
        </template>
      </UCard>
    </div>
  </UApp>
</template>
