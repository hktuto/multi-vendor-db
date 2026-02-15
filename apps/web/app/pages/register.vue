<script setup lang="ts">
import { z } from 'zod'

// Redirect if already logged in
const { loggedIn, fetch: refreshSession } = useUserSession()
const route = useRoute()
const toast = useToast()

// If already logged in, redirect
if (loggedIn.value) {
  await navigateTo('/dashboard')
}

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  
  try {
    const result = await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: event.data.name,
        email: event.data.email,
        password: event.data.password
      }
    })
    
    if (result.success) {
      toast.add({
        title: 'Success',
        description: 'Account created successfully',
        color: 'success'
      })
      
      // Refresh session
      await refreshSession()
      
      // Redirect to dashboard
      await navigateTo('/dashboard')
    }
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.statusMessage || 'Failed to create account',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// OAuth login handlers
function loginWithGitHub() {
  window.location.href = '/api/auth/github'
}

function loginWithGoogle() {
  window.location.href = '/api/auth/google'
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Create an account</h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">Start your journey with us</p>
        </div>
      </template>

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Full Name" name="name">
          <UInput
            v-model="state.name"
            placeholder="John Doe"
            icon="i-heroicons-user"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="you@example.com"
            icon="i-heroicons-envelope"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Confirm Password" name="confirmPassword">
          <UInput
            v-model="state.confirmPassword"
            type="password"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          block
          :loading="loading"
        >
          Create Account
        </UButton>
      </UForm>

      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
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
        <p class="text-center text-sm text-gray-500">
          Already have an account?
          <NuxtLink to="/login" class="text-primary hover:underline">
            Sign in
          </NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>
