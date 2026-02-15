<script setup lang="ts">
// This page is client-only because PGlite/Electric SQL only works in the browser
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { user, loggedIn } = useUserSession()
const toast = useToast()

// Use the composables
const userSync = useUserSync()
const pg = usePgWorker()

// Local state for data (pages query themselves)
const users = ref<SyncedUser[]>([])
const currentUser = ref<SyncedUser | null>(null)
const userCount = computed(() => users.value.length)

// UI state
const newName = ref('')
const isLoading = ref(false)
const isDataLoading = ref(false)

// Unsubscribe function for cleanup
let unsubscribeSync: (() => void) | null = null

/**
 * Load users from local DB using usePgWorker
 * Pages query data themselves
 */
async function loadUsers() {
  isDataLoading.value = true
  try {
    users.value = await userSync.getAllUsers()
    console.log(`[electric-test] Loaded ${users.value.length} users`)
  } catch (error) {
    console.error('Failed to load users:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load users from local DB',
      color: 'error'
    })
  } finally {
    isDataLoading.value = false
  }
}

/**
 * Load current user from local DB
 */
async function loadCurrentUser() {
  if (!user.value?.id) return
  try {
    currentUser.value = await userSync.getCurrentUser(user.value.id)
  } catch (error) {
    console.error('Failed to load current user:', error)
  }
}

/**
 * Start syncing using ShapeStream pattern
 * - useElectricSync for sync events
 * - usePgWorker for data queries
 */
async function startSync() {
  if (!loggedIn.value) return

  try {
    // Subscribe to sync events
    unsubscribeSync = await userSync.sync({
      onInsert: (newUser) => {
        console.log('[electric-test] Insert received:', newUser.email)
        toast.add({
          title: 'New User',
          description: `${newUser.email} was added`,
          color: 'success'
        })
        // Re-query data after insert
        loadUsers()
        loadCurrentUser()
      },
      onUpdate: (updatedUser, oldUser) => {
        console.log('[electric-test] Update received:', updatedUser.email)
        // Re-query data after update
        loadUsers()
        loadCurrentUser()
      },
      onDelete: (id) => {
        console.log('[electric-test] Delete received:', id)
        toast.add({
          title: 'User Removed',
          description: 'A user was deleted',
          color: 'neutral'
        })
        // Re-query data after delete
        loadUsers()
        loadCurrentUser()
      },
      onUpToDate: () => {
        console.log('[electric-test] Sync is up to date')
        toast.add({
          title: 'Sync Complete',
          description: 'User data is up to date',
          color: 'success'
        })
        // Load data when initial sync is complete
        loadUsers()
        loadCurrentUser()
      },
      onError: (error) => {
        console.error('[electric-test] Sync error:', error)
        toast.add({
          title: 'Sync Error',
          description: error.message,
          color: 'error'
        })
      }
    })

    toast.add({
      title: 'Sync Started',
      description: 'Subscribed to user sync events',
      color: 'success'
    })
  } catch (error) {
    console.error('Failed to start sync:', error)
    toast.add({
      title: 'Sync Error',
      description: 'Failed to start sync. See console.',
      color: 'error'
    })
  }
}

/**
 * Stop syncing
 */
function stopSync() {
  if (unsubscribeSync) {
    unsubscribeSync()
    unsubscribeSync = null
  }
  userSync.stopSync()
  toast.add({
    title: 'Sync Stopped',
    description: 'Unsubscribed from sync events',
    color: 'neutral'
  })
}

/**
 * Update profile
 */
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

/**
 * Clear local data (simulate logout cleanup)
 */
async function clearLocalData() {
  await userSync.logout()
  users.value = []
  currentUser.value = null
  toast.add({
    title: 'Cleared',
    description: 'Local user data cleared',
    color: 'neutral'
  })
}

/**
 * Reload users from local DB
 */
async function reloadUsers() {
  await loadUsers()
  await loadCurrentUser()
  toast.add({
    title: 'Reloaded',
    description: `Found ${users.value.length} users in local DB`,
    color: 'success'
  })
}

/**
 * Demo: Query data directly using usePgWorker
 * This shows how pages can query themselves
 */
async function queryWithPgWorker() {
  isDataLoading.value = true
  try {
    // Example: Direct query using usePgWorker
    const result = await pg.query<SyncedUser>(
      'SELECT * FROM users WHERE email LIKE $1',
      ['%@%']
    )
    console.log('[electric-test] Direct query result:', result.rows)
    toast.add({
      title: 'Direct Query',
      description: `Queried ${result.rows.length} users directly with usePgWorker`,
      color: 'success'
    })
  } catch (error) {
    console.error('Direct query failed:', error)
  } finally {
    isDataLoading.value = false
  }
}

// Watch for login/logout to sync/clear data
watch(() => loggedIn.value, async (isLoggedIn) => {
  if (isLoggedIn) {
    await startSync()
  } else {
    stopSync()
    await clearLocalData()
  }
}, { immediate: true })

// Cleanup on unmount
onUnmounted(() => {
  if (unsubscribeSync) {
    unsubscribeSync()
  }
})

// Debug info computed
const debugInfo = computed(() => ({
  loggedIn: loggedIn.value,
  sessionUserId: user.value?.id || null,
  currentUserId: currentUser.value?.id || null,
  userCount: userCount.value,
  isPgReady: pg.isReady.value,
  isSyncing: userSync.isSyncing.value,
  isUpToDate: userSync.isUpToDate.value,
  hasError: !!userSync.error.value,
  errorMessage: userSync.error.value?.message || null,
}))
</script>

<template>
  <ClientOnly>
    <div class="p-6 max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold mb-2">⚡ Electric SQL Sync - ShapeStream Pattern</h1>
        <p class="text-gray-600 dark:text-gray-400">
          Using ShapeStream for sync events + usePgWorker for data queries
        </p>
      </div>

      <!-- Connection Status -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-wifi" />
            <span class="font-semibold">Connection Status</span>
          </div>
        </template>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full"
              :class="pg.isReady.value ? 'bg-green-500' : 'bg-red-500'"
            />
            <span>PGlite: {{ pg.isReady.value ? 'Ready' : 'Loading...' }}</span>
          </div>

          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full"
              :class="userSync.isSyncing.value ? 'bg-yellow-500 animate-pulse' : userSync.isUpToDate.value ? 'bg-green-500' : 'bg-gray-400'"
            />
            <span>Sync: {{ userSync.isUpToDate.value ? 'Up to date' : userSync.isSyncing.value ? 'Syncing...' : 'Idle' }}</span>
          </div>

          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full"
              :class="loggedIn ? 'bg-green-500' : 'bg-red-500'"
            />
            <span>Auth: {{ loggedIn ? 'Logged in' : 'Logged out' }}</span>
          </div>

          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full"
              :class="userCount > 0 ? 'bg-blue-500' : 'bg-gray-400'"
            />
            <span>Users: {{ userCount }}</span>
          </div>
        </div>
      </UCard>

      <!-- Current User -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-user" />
            <span class="font-semibold">Current User (Queried with usePgWorker)</span>
          </div>
        </template>

        <div v-if="currentUser" class="space-y-2">
          <div class="flex items-center gap-4">
            <UAvatar
              :text="currentUser.name?.[0] || currentUser.email[0]"
              size="lg"
            />
            <div>
              <p class="font-medium">{{ currentUser.name || 'No name set' }}</p>
              <p class="text-sm text-gray-500">{{ currentUser.email }}</p>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p><span class="font-medium">ID:</span> {{ currentUser.id }}</p>
            <p><span class="font-medium">Created:</span> {{ new Date(currentUser.created_at).toLocaleString() }}</p>
            <p><span class="font-medium">Updated:</span> {{ new Date(currentUser.updated_at).toLocaleString() }}</p>
          </div>
        </div>

        <div v-else-if="isDataLoading" class="text-center py-8 text-gray-500">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl mb-2" />
          <p>Loading user data...</p>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <UIcon name="i-lucide-user-x" class="text-2xl mb-2" />
          <p>No user data. Click "Reload Users" to query.</p>
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
          <div class="flex flex-wrap gap-2 pt-4 border-t">
            <UButton
              color="primary"
              variant="outline"
              @click="reloadUsers"
              :loading="isDataLoading"
            >
              <UIcon name="i-lucide-refresh-cw" class="mr-1" />
              Reload Users
            </UButton>

            <UButton
              color="secondary"
              variant="outline"
              @click="queryWithPgWorker"
              :loading="isDataLoading"
            >
              <UIcon name="i-lucide-database" class="mr-1" />
              Direct Query
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
              <span class="font-semibold">Synced Users ({{ userCount }})</span>
            </div>
          </div>
        </template>

        <div v-if="users.length > 0" class="space-y-2">
          <div
            v-for="u in users"
            :key="u.id"
            class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between"
            :class="{ 'ring-2 ring-primary': u.id === currentUser?.id }"
          >
            <div class="flex items-center gap-3">
              <UAvatar
                :text="u.name?.[0] || u.email[0]"
                size="sm"
              />
              <div>
                <p class="font-medium text-sm">
                  {{ u.name || 'No name' }}
                  <span v-if="u.id === currentUser?.id" class="text-xs text-primary ml-1">(you)</span>
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
          <p>No users in local DB yet.</p>
          <p class="text-sm mt-2">Sync is active - data will appear here.</p>
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

        <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto"{{
          JSON.stringify(debugInfo, null, 2)
        }}></pre>
      </UCard>

      <!-- Pattern Documentation -->
      <UCard class="mt-6">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-book-open" />
            <span class="font-semibold">ShapeStream Pattern</span>
          </div>
        </template>

        <div class="prose dark:prose-invert max-w-none text-sm">
          <p>This page demonstrates the new Electric SQL ShapeStream pattern:</p>

          <ul class="list-disc pl-5 space-y-1">
            <li><strong>useElectricSync</strong> - Subscribes to sync events (onInsert, onUpdate, onDelete, onUpToDate, onError)</li>
            <li><strong>usePgWorker</strong> - Pages query data themselves using query(), queryOne(), or liveQuery()</li>
            <li><strong>Separation of concerns</strong> - Sync events trigger re-queries, not data management</li>
          </ul>

          <pre class="bg-gray-100 dark:bg-gray-900 p-3 rounded mt-4"v-pre>
// Subscribe to sync events
const unsubscribe = await electric.subscribe('users', shapeUrl, {
  onInsert: (user) => { /* re-query data */ },
  onUpdate: (user, old) => { /* re-query data */ },
  onDelete: (id) => { /* re-query data */ },
  onUpToDate: () => { /* initial sync complete */ },
  onError: (error) => { /* handle error */ }
})

// Query data yourself
const { rows } = await pg.query('SELECT * FROM users')
          </pre>
        </div>
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
