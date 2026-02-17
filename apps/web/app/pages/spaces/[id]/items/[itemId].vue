<script setup lang="ts">
import type { SyncedSpaceItem } from '~/composables/useSpaces'
import { useSpaceItems } from '~/composables/useSpaceItems'

const route = useRoute()
const router = useRouter()
const spaceId = route.params.id as string
const itemId = route.params.itemId as string

// Composables
const { getMySpaceRole } = useSpaces()
const spaceItems = useSpaceItems()
const toast = useToast()

// Check permissions
const myRole = ref<{ role: string | null; isAdmin: boolean }>({ role: null, isAdmin: false })
const canEdit = computed(() => myRole.value.isAdmin || myRole.value.role === 'editor')

// Load item
const { data: item, pending: itemLoading, refresh: refreshItem } = await useFetch<SyncedSpaceItem>(`/api/space-items/${itemId}`)

// Load space members for avatar group
const { queryMembers } = useSpaces()
const members = ref<any[]>([])

// Child items (for folders)
const childItems = computed(() => {
  if (!item.value || item.value.type !== 'folder') return []
  return spaceItems.getItemChildren(spaceId, itemId)
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

function getIconColor(type: string): string {
  const colors: Record<string, string> = {
    folder: 'text-amber-500',
    table: 'text-blue-500',
    view: 'text-purple-500',
    dashboard: 'text-green-500'
  }
  return colors[type] || 'text-gray-500'
}

// Handle rename
async function handleRename(newName: string) {
  if (!item.value || !canEdit.value) return
  
  try {
    await spaceItems.updateItem(spaceId, itemId, { name: newName })
    await refreshItem()
    toast.add({
      title: 'Success',
      description: 'Folder renamed successfully',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to rename',
      color: 'error'
    })
    throw error
  }
}

// Handle description update
async function handleDescriptionUpdate(newDescription: string) {
  if (!item.value || !canEdit.value) return
  
  try {
    await spaceItems.updateItem(spaceId, itemId, { description: newDescription })
    await refreshItem()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to update description',
      color: 'error'
    })
  }
}

// Navigate to child item
function navigateToChild(childItem: SyncedSpaceItem) {
  router.push(`/spaces/${spaceId}/items/${childItem.id}`)
}

// Navigate to settings
function openSettings() {
  // Could open a modal or navigate to settings page
  toast.add({
    title: 'Settings',
    description: 'Folder settings coming soon',
    color: 'info'
  })
}

// Load data
onMounted(async () => {
  const roleInfo = await getMySpaceRole(spaceId)
  myRole.value = roleInfo
  members.value = await queryMembers(spaceId)
  
  // Subscribe to items sync
  await spaceItems.subscribeToItems(spaceId)
})

onUnmounted(() => {
  spaceItems.unsubscribe()
})

// Handle errors
watchEffect(() => {
  if (!itemLoading.value && !item.value) {
    navigateTo(`/spaces/${spaceId}/items`)
  }
})
</script>

<template>
  <div v-if="itemLoading" class="p-8 space-y-4">
    <USkeleton class="h-12 w-64" />
    <USkeleton class="h-24" />
    <USkeleton class="h-48" />
  </div>

  <div v-else-if="item" class="p-6 max-w-6xl mx-auto">
    <!-- Header Section -->
    <div class="flex items-start gap-4 mb-6">
      <!-- Icon -->
      <div class="flex-shrink-0">
        <UIcon 
          :name="getIcon(item.type)" 
          class="w-12 h-12"
          :class="getIconColor(item.type)"
        />
      </div>

      <!-- Title & Description -->
      <div class="flex-1 min-w-0">
        <!-- Title with Inline Edit -->
        <div class="flex items-center gap-3 mb-2">
          <InlineEditableText
            v-model="item.name"
            placeholder="Folder name"
            :disabled="!canEdit"
            text-class="text-2xl font-semibold"
            input-class="text-2xl"
            @save="handleRename"
          />
          <!-- Settings Button -->
          <UButton
            v-if="canEdit"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-settings"
            @click="openSettings"
          />
        </div>

        <!-- Description with TipTap -->
        <div class="mt-4">
          <label class="text-sm text-dimmed mb-2 block">Description</label>
          <TiptapEditor
            v-model="item.description"
            placeholder="Add a description..."
            :disabled="!canEdit"
            :editable="canEdit"
            @save="handleDescriptionUpdate"
          />
        </div>

        <!-- Members Avatar Group -->
        <div class="flex items-center gap-2 mt-3">
          <span class="text-xs text-dimmed">Shared with:</span>
          <UAvatarGroup :max="5">
            <UAvatar
              v-for="member in members"
              :key="member.user_id"
              :src="member.avatar_url"
              :alt="member.name"
              :title="`${member.name} (${member.role})`"
              size="xs"
            />
          </UAvatarGroup>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <UDivider class="my-6" />

    <!-- Children Section (for folders) -->
    <template v-if="item.type === 'folder'">
      <div class="mb-4">
        <h2 class="text-lg font-semibold mb-1">Contents</h2>
        <p class="text-sm text-dimmed">{{ childItems.length }} items</p>
      </div>

      <!-- Empty State -->
      <div 
        v-if="childItems.length === 0" 
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-folder-open" class="w-16 h-16 text-dimmed mb-4" />
        <p class="text-dimmed">This folder is empty</p>
        <p class="text-sm text-dimmed mt-1">Add items to organize your work</p>
      </div>

      <!-- Children Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="child in childItems"
          :key="child.id"
          class="cursor-pointer hover:border-primary transition-colors group"
          @click="navigateToChild(child)"
        >
          <div class="flex items-start gap-3">
            <!-- Icon -->
            <UIcon
              :name="getIcon(child.type)"
              class="w-8 h-8 flex-shrink-0"
              :class="getIconColor(child.type)"
            />

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h3 class="font-medium truncate group-hover:text-primary transition-colors">
                {{ child.name }}
              </h3>
              <p v-if="child.description" class="text-sm text-dimmed line-clamp-2 mt-1">
                {{ child.description }}
              </p>
              <p class="text-xs text-dimmed mt-2 capitalize">
                {{ child.type }}
              </p>
            </div>

            <!-- Arrow -->
            <UIcon 
              name="i-lucide-chevron-right" 
              class="w-5 h-5 text-dimmed group-hover:text-primary transition-colors"
            />
          </div>
        </UCard>
      </div>
    </template>

    <!-- Non-folder items details -->
    <template v-else>
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
    </template>
  </div>
</template>