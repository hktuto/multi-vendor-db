<script setup lang="ts">
const { loggedIn } = useUserSession()

// Redirect based on auth status
if (loggedIn.value) {
  await navigateTo('/dashboard')
} else {
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <ULoadingIcon />
  </div>
</template>
