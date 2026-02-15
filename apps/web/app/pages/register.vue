<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: 'auth'
})

const { loggedIn, fetch: refreshSession } = useUserSession()
const toast = useToast()

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
      
      await refreshSession()
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

function loginWithGitHub() {
  window.location.href = '/api/auth/github'
}

function loginWithGoogle() {
  window.location.href = '/api/auth/google'
}
</script>

<template>
  <UCard class="w-full max-w-md">
    <template #header>
      <div class="text-center">
        <h1 class="text-2xl font-bold">Create an account</h1>
        <p class="text-muted mt-1">Start your journey with us</p>
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Full Name" name="name">
        <UInput
          v-model="state.name"
          placeholder="John Doe"
          icon="i-lucide-user"
          class="w-full"
        />
      </UFormField>

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

      <UFormField label="Confirm Password" name="confirmPassword">
        <UInput
          v-model="state.confirmPassword"
          type="password"
          placeholder="••••••••"
          icon="i-lucide-lock"
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
        Already have an account?
        <NuxtLink to="/login" class="text-primary hover:underline">
          Sign in
        </NuxtLink>
      </p>
    </template>
  </UCard>
</template>
