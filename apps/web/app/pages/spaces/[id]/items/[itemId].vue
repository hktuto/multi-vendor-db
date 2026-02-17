<script setup lang="ts">
import type { SyncedSpaceItem } from '~/composables/useSpaces'

const route = useRoute()
const spaceId = route.params.id as string
const itemId = route.params.itemId as string

// Load item
const { data: item, pending } = await useFetch<SyncedSpaceItem>(`/api/space-items/${itemId}`)

// Handle errors
watchEffect(() => {
  if (!pending.value && !item.value) {
    navigateTo(`/spaces/${spaceId}/items`)
  }
})

// Get icon
function getIcon(type: string): string {
  const icons: Record<string, string> = {
    folder: 'i-lucide-folder',
    table: 'i-lucide-table',
    view: 'i-lucide-layout-dashboard',
    dashboard: 'i-lucide-bar-chart'
  }
  return icons[type] || 'i-lucide-file'
}
</script>

<template>
  <div v-if="pending" class="p-8">
    <USkeleton class="h-8 w-48 mb-4" />
    <USkeleton class="h-32" />
  </div>

  <div v-else-if="item" class="p-6">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <UIcon :name="getIcon(item.type)" class="w-8 h-8 text-primary" />
      <div>
        <h1 class="text-xl font-semibold">{{ item.name }}</h1>
        <p v-if="item.description" class="text-sm text-dimmed">
          {{ item.description }}
        </p>
      </div>
    </div>

    <!-- Content based on type -->
    <UCard>
      <template #header>
        <h3 class="font-semibold capitalize">{{ item.type }} Details</h3>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm text-dimmed">Type</label>
            <p class="font-medium capitalize">{{ item.type }}</p>
          </div>
          <div>
            <label class="text-sm text-dimmed">Created</label>
            <p class="font-medium">{{ new Date(item.created_at).toLocaleDateString() }}</p>
          </div>
          <div v-if="item.config && Object.keys(item.config).length > 0">
            <label class="text-sm text-dimmed">Config</label>
            <pre class="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">{{ JSON.stringify(item.config, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
