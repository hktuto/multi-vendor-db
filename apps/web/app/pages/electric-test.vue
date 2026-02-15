<script setup lang="ts">
// This page is client-only because PGlite/Electric SQL only works in the browser
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { user, loggedIn } = useUserSession()
const userSync = useUserSync()
const toast = useToast()

// Local state for CRUD testing
const newName = ref('')
const isLoading = ref(false)

// Watch for login/logout to sync/clear data
watch(() => loggedIn.value, async (isLoggedIn) => {
  if (isLoggedIn && user.value?.id) {
    try {
      await userSync.syncUser(user.value.id)
      toast.add({
        title: 'Sync Started',
        description: 'User data syncing to local database',
        color: 'success'
      })
    } catch (error) {
      console.error('Sync failed:', error)
      toast.add({
        title: 'Sync Error',
        description: 'Failed to start sync. See console.',
        color: 'error'
      })
    }
  } else {
    await userSync.logout()
  }
}, { immediate: true })

// Update profile
async function updateProfile() {
  if (!newName.value || !user.value?.id) return
  
  isLoading.value = true
  try {
    await userSync.updateUser(user.value.id, { name: newName.value })
    newName.value = ''
    toast.add({
      title: 'Updated',
      description: 'Profile updated locally (sync pending)',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to update profile',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

// Clear local data (simulate logout cleanup)
async function clearLocalData() {
  await userSync.clearUserData()
  toast.add({
    title: 'Cleared',
    description: 'Local user data cleared',
    color: 'neutral'
  })
}

// Reload users from local DB
async function reloadUsers() {
  await userSync.loadUsers()
  toast.add({
    title: 'Reloaded',
    description: `Found ${userSync.users.value.length} users in local DB`,
    color: 'success'
  })
}

// Debug info computed
const debugInfo = computed(() => ({
  connected: userSync.isConnected.value,
  syncing: userSync.isSyncing.value,
  upToDate: userSync.isUpToDate.value,
  currentUser: userSync.currentUser.value?.id || null,
  userCount: userSync.users.value.length,
  sessionUserId: user.value?.id || null,
  loggedIn: loggedIn.value
}))
</script>

<template>
  <ClientOnly>
    <div class="p-6 max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold mb-2">⚡ Electric SQL Sync POC</h1>
        <p class="text-gray-600">Test local-first sync with PGlite</p>
      </div>

      <!-- Connection Status -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-wifi" />
            <span class="font-semibold">Connection Status</span>
          </div>
        </template>

        <div class="flex gap-6 text-sm">
          <div class="flex items-center gap-2">
            <span 
              class="w-3 h-3 rounded-full"
              :class="userSync.isConnected.value ? 'bg-green-500' : 'bg-red-500'"
            />
            <span>PGlite: {{ userSync.isConnected.value ? 'Connected' : 'Disconnected' }}</span>
          </div>
          
          <div class="flex items-center gap-2">
            <span 
              class="w-3 h-3 rounded-full"
              :class="userSync.isUpToDate.value ? 'bg-green-500' : userSync.isSyncing.value ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'"
            />
            <span>Sync: {{ userSync.isUpToDate.value ? 'Up to date' : userSync.isSyncing.value ? 'Syncing...' : 'Not synced' }}</span>
          </div>
        </div>
      </UCard>

      <!-- Current User -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-user" />
            <span class="font-semibold">Current User (Synced)</span>
          </div>
        </template>

        <div v-if="userSync.currentUser.value" class="space-y-2">
          <div class="flex items-center gap-4">
            <UAvatar
              :text="userSync.currentUser.value.name?.[0] || userSync.currentUser.value.email[0]"
              size="lg"
            />
            <div>
              <p class="font-medium">{{ userSync.currentUser.value.name || 'No name set' }}</p>
              <p class="text-sm text-gray-500">{{ userSync.currentUser.value.email }}</p>
            </div>
          </div>
          
          <div class="mt-4 pt-4 border-t text-sm text-gray-600 space-y-1">
            <p><span class="font-medium">ID:</span> {{ userSync.currentUser.value.id }}</p>
            <p><span class="font-medium">Created:</span> {{ new Date(userSync.currentUser.value.created_at).toLocaleString() }}</p>
            <p><span class="font-medium">Updated:</span> {{ new Date(userSync.currentUser.value.updated_at).toLocaleString() }}</p>
          </div>
        </div>
        
        <div v-else-if="userSync.isSyncing.value" class="text-center py-8 text-gray-500">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl mb-2" />
          <p>Loading user data...</p>
        </div>
        
        <div v-else class="text-center py-8 text-gray-500">
          <UIcon name="i-lucide-user-x" class="text-2xl mb-2" />
          <p>No user data synced yet</p>
        </div>
      </UCard>

      <!-- CRUD Test -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-flask-conical" />
            <span class="font-semibold">CRUD Test</span>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Update Name -->
          <div class="flex gap-2">
            <UInput
              v-model="newName"
              placeholder="New display name"
              class="flex-1"
            />
            <UButton
              color="primary"
              :loading="isLoading"
              :disabled="!newName"
              @click="updateProfile"
            >
              Update
            </UButton>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-4 border-t">
            <UButton
              color="neutral"
              variant="outline"
              @click="reloadUsers"
            >
              <UIcon name="i-lucide-refresh-cw" class="mr-1" />
              Reload Users
            </UButton>
            
            <UButton
              color="error"
              variant="outline"
              @click="clearLocalData"
            >
              <UIcon name="i-lucide-trash-2" class="mr-1" />
              Clear Local Data
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Synced Users List -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" />
              <span class="font-semibold">Synced Users ({{ userSync.users.value.length }})</span>
            </div>
          </div>
        </template>

        <div v-if="userSync.users.value.length > 0" class="space-y-2">
          <div
            v-for="u in userSync.users.value"
            :key="u.id"
            class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between"
            :class="{ 'ring-2 ring-primary': u.id === userSync.currentUser.value?.id }"
          >
            <div class="flex items-center gap-3">
              <UAvatar
                :text="u.name?.[0] || u.email[0]"
                size="sm"
              />
              <div>
                <p class="font-medium text-sm">
                  {{ u.name || 'No name' }}
                  <span v-if="u.id === userSync.currentUser.value?.id" class="text-xs text-primary ml-1">(you)</span>
                </p>
                <p class="text-xs text-gray-500">{{ u.email }}</p>
              </div>
            </div>
            
            <p class="text-xs text-gray-400">
              {{ new Date(u.updated_at).toLocaleDateString() }}
            </p>
          </div>
        </div>
        
        <div v-else class="text-center py-8 text-gray-500">
          <UIcon name="i-lucide-users" class="text-2xl mb-2" />
          <p>No users synced yet</p>
        </div>
      </UCard>

      <!-- Debug Info -->
      <UCard class="mt-6">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-bug" />
            <span class="font-semibold">Debug Info</span>
          </div>
        </template>

        <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">{{
          JSON.stringify(debugInfo, null, 2)
        }}</pre>
      </UCard>
    </div>

    <template #fallback>
      <div class="p-6 max-w-4xl mx-auto">
        <UCard>
          <div class="text-center py-12">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl text-primary mb-4" />
            <p class="text-gray-600">Loading Electric SQL client...</p>
          </div>
        </UCard>
      </div>
    </template>
  </ClientOnly>
</template>
