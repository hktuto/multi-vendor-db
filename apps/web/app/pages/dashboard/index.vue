<script setup lang="ts">
// This page requires authentication
definePageMeta({
  middleware: ['auth']
})

const { user, clear } = useUserSession()
const toast = useToast()

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/login')
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to logout',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
          </div>
          
          <div class="flex items-center gap-4">
            <span class="text-sm text-gray-600 dark:text-gray-300">
              Welcome, {{ user?.name }}
            </span>
            <UButton
              color="neutral"
              variant="ghost"
              @click="logout"
            >
              <UIcon name="i-heroicons-arrow-right-on-rectangle" class="mr-2" />
              Logout
            </UButton>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Welcome Card -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Welcome Back!</h2>
          </template>
          <p class="text-gray-600 dark:text-gray-300">
            You're logged in as <strong>{{ user?.email }}</strong>
          </p>
          <template #footer>
            <p class="text-sm text-gray-500">
              User ID: {{ user?.id }}
            </p>
          </template>
        </UCard>

        <!-- Quick Actions -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Quick Actions</h2>
          </template>
          <div class="space-y-2">
            <UButton to="/companies" block color="primary">
              <UIcon name="i-heroicons-building-office" class="mr-2" />
              Manage Companies
            </UButton>
            <UButton to="/profile" block color="neutral" variant="outline">
              <UIcon name="i-heroicons-user" class="mr-2" />
              Edit Profile
            </UButton>
          </div>
        </UCard>

        <!-- Status Card -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Status</h2>
          </template>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-check-circle" class="text-green-500" />
            <span>Authenticated</span>
          </div>
          <p class="text-sm text-gray-500 mt-2">
            Session is active
          </p>
        </UCard>
      </div>
    </main>
  </div>
</template>
