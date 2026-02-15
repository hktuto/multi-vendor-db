<script setup lang="ts">
definePageMeta({
  layout: false
})

const { loggedIn } = useUserSession()

// Redirect based on auth status
if (loggedIn.value) {
  await navigateTo('/dashboard')
} else {
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <ULoadingIcon />
  </div>
</template>
