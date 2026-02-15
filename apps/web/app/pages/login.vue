<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: 'auth'
})

const { loggedIn, fetch: refreshSession } = useUserSession()
const route = useRoute()
const toast = useToast()

// Redirect if already logged in
if (loggedIn.value) {
  await navigateTo('/dashboard')
}

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: '',
  password: ''
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  
  try {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: event.data
    })
    
    if (result.success) {
      toast.add({
        title: 'Success',
        description: 'Logged in successfully',
        color: 'success'
      })
      
      await refreshSession()
      await navigateTo('/dashboard')
    }
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.statusMessage || 'Invalid email or password',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function loginWithGitHub() {
  window.location.href = '/api/auth/github'
}

function loginWithGoogle() {
  window.location.href = '/api/auth/google'
}

onMounted(() => {
  const error = route.query.error as string
  if (error) {
    toast.add({
      title: 'Authentication Error',
      description: error === 'github-auth-failed' 
        ? 'GitHub authentication failed. Please try again.' 
        : error === 'google-auth-failed'
        ? 'Google authentication failed. Please try again.'
        : 'Authentication failed.',
      color: 'error'
    })
  }
})
</script>

<template>
  <UCard class="w-full max-w-md">
    <template #header>
      <div class="text-center">
        <h1 class="text-2xl font-bold">Welcome back</h1>
        <p class="text-muted mt-1">Sign in to your account</p>
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput
          v-model="state.email"
          type="email"
          placeholder="you@example.com"
          icon="i-lucide-mail"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Password" name="password">
        <UInput
          v-model="state.password"
          type="password"
          placeholder="••••••••"
          icon="i-lucide-lock"
          class="w-full"
        />
      </UFormField>

      <div class="flex items-center justify-between">
        <UCheckbox label="Remember me" />
        <NuxtLink to="/forgot-password" class="text-sm text-primary hover:underline">
          Forgot password?
        </NuxtLink>
      </div>

      <UButton
        type="submit"
        color="primary"
        block
        :loading="loading"
      >
        Sign in
      </UButton>
    </UForm>

    <div class="mt-6">
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-default" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-default text-muted">Or continue with</span>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-2 gap-3">
        <UButton
          color="neutral"
          variant="outline"
          block
          @click="loginWithGitHub"
        >
          <UIcon name="i-simple-icons-github" class="mr-2" />
          GitHub
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          block
          @click="loginWithGoogle"
        >
          <UIcon name="i-simple-icons-google" class="mr-2" />
          Google
        </UButton>
      </div>
    </div>

    <template #footer>
      <p class="text-center text-sm text-muted">
        Don't have an account?
        <NuxtLink to="/register" class="text-primary hover:underline">
          Sign up
        </NuxtLink>
      </p>
    </template>
  </UCard>
</template>
