<script setup lang="ts">
import type { SyncedSpaceItem } from '~/composables/useSpaces'
import { VueDraggableNext } from 'vue-draggable-next'

const props = defineProps<{
  spaceId: string
}>()

const emit = defineEmits<{
  select: [item: SyncedSpaceItem]
  'update:items': [items: SyncedSpaceItem[]]
}>()

// Use spaces composable for queries
const { queryItems, buildItemTree } = useSpaces()
const pg = usePgWorker()

// State
const items = ref<SyncedSpaceItem[]>([])
const isLoading = ref(false)
const expandedFolders = ref<Set<string>>(new Set())
const highlightedItems = ref<Set<string>>(new Set())
const justCreatedItemId = ref<string | null>(null)
const selectedItemId = ref<string | null>(null)

// Modals
const showCreateFolderModal = ref(false)
const showCreateItemModal = ref(false)
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const currentParentId = ref<string | null>(null)
const createItemType = ref<'folder' | 'table' | 'view' | 'dashboard'>('folder')
const renamingItem = ref<SyncedSpaceItem | null>(null)
const deletingItem = ref<SyncedSpaceItem | null>(null)

// Computed tree structure
const treeItems = computed(() => {
  return buildItemTree(items.value)
})

// Draggable root items
const draggableRootItems = computed({
  get: () => treeItems.value,
  set: (value) => {
    // Emit reorder event for root items
    if (value.length > 0) {
      const updates = value.map((item, index) => ({
        id: item.id,
        orderIndex: index,
        parentId: null
      }))
      onReorder(updates)
    }
  }
})

// Load items from local PGlite
async function loadItems() {
  isLoading.value = true
  console.log('[SpaceItemTree] Loading items for space:', props.spaceId)
  try {
    const result = await queryItems(props.spaceId)
    console.log('[SpaceItemTree] queryItems result:', result)
    console.log('[SpaceItemTree] result type:', typeof result)
    console.log('[SpaceItemTree] result isArray:', Array.isArray(result))
    console.log('[SpaceItemTree] result length:', result?.length)
    items.value = result
    console.log('[SpaceItemTree] treeItems computed:', treeItems.value)
    // Expand all folders by default
    expandAllFolders()
  } catch (error) {
    console.error('[SpaceItemTree] Failed to load space items:', error)
    items.value = []
    useToast().add({
      title: 'Error',
      description: 'Failed to load items',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

// Expand all folders
function expandAllFolders() {
  const collectFolderIds = (flatItems: SyncedSpaceItem[]) => {
    flatItems.forEach(item => {
      if (item.type === 'folder') {
        expandedFolders.value.add(item.id)
      }
    })
  }
  collectFolderIds(items.value)
}

// Toggle folder expansion
function toggleFolder(folderId: string) {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  } else {
    expandedFolders.value.add(folderId)
  }
}

// Check if folder is expanded
function isFolderExpanded(folderId: string): boolean {
  return expandedFolders.value.has(folderId)
}

// Check if item is selected
function isItemSelected(itemId: string): boolean {
  return selectedItemId.value === itemId
}

// Handle item selection
function handleSelect(item: SyncedSpaceItem, event?: MouseEvent) {
  selectedItemId.value = item.id
  emit('select', item)
  
  // If folder, also expand it
  if (item.type === 'folder') {
    expandedFolders.value.add(item.id)
  }
}

// Handle create
function handleCreate(type: 'folder' | 'table' | 'view' | 'dashboard', parentId?: string | null) {
  currentParentId.value = parentId || null
  createItemType.value = type
  
  if (type === 'folder') {
    showCreateFolderModal.value = true
  } else {
    showCreateItemModal.value = true
  }
}

// Create folder via API
async function createFolder(name: string) {
  try {
    const response = await $fetch<SyncedSpaceItem>(`/api/spaces/${props.spaceId}/items`, {
      method: 'POST',
      body: {
        type: 'folder',
        name,
        parentId: currentParentId.value
      }
    })
    
    // Reload from local DB (Electric will sync it)
    await loadItems()
    
    // Highlight new item
    justCreatedItemId.value = response.id
    highlightedItems.value.add(response.id)
    setTimeout(() => {
      highlightedItems.value.delete(response.id)
      justCreatedItemId.value = null
    }, 1500)
    
    useToast().add({
      title: 'Success',
      description: `Folder "${name}" created`,
      color: 'success'
    })
  } catch (error: any) {
    useToast().add({
      title: 'Error',
      description: error.message || 'Failed to create folder',
      color: 'error'
    })
  }
}

// Create item via API
async function createItem(name: string, config?: Record<string, any>) {
  try {
    const response = await $fetch<SyncedSpaceItem>(`/api/spaces/${props.spaceId}/items`, {
      method: 'POST',
      body: {
        type: createItemType.value,
        name,
        parentId: currentParentId.value,
        config: config || {}
      }
    })
    
    await loadItems()
    
    // Highlight and navigate
    justCreatedItemId.value = response.id
    highlightedItems.value.add(response.id)
    setTimeout(() => {
      highlightedItems.value.delete(response.id)
      justCreatedItemId.value = null
    }, 1500)
    
    handleSelect(response)
    
    useToast().add({
      title: 'Success',
      description: `${createItemType.value} "${name}" created`,
      color: 'success'
    })
  } catch (error: any) {
    useToast().add({
      title: 'Error',
      description: error.message || 'Failed to create item',
      color: 'error'
    })
  }
}

// Handle rename
function handleRename(item: SyncedSpaceItem) {
  renamingItem.value = item
  showRenameModal.value = true
}

// Confirm rename
async function confirmRename(newName: string) {
  if (!renamingItem.value || newName === renamingItem.value.name) return
  
  try {
    await $fetch(`/api/space-items/${renamingItem.value.id}`, {
      method: 'PATCH',
      body: { name: newName }
    })
    
    await loadItems()
    useToast().add({
      title: 'Success',
      description: 'Item renamed successfully',
      color: 'success'
    })
  } catch (error: any) {
    useToast().add({
      title: 'Error',
      description: error.message || 'Failed to rename',
      color: 'error'
    })
  }
}

// Handle delete
function handleDelete(item: SyncedSpaceItem) {
  deletingItem.value = item
  showDeleteModal.value = true
}

// Confirm delete
async function confirmDelete() {
  if (!deletingItem.value) return
  
  try {
    await $fetch(`/api/space-items/${deletingItem.value.id}`, {
      method: 'DELETE'
    })
    
    await loadItems()
    useToast().add({
      title: 'Success',
      description: 'Item deleted successfully',
      color: 'success'
    })
  } catch (error: any) {
    useToast().add({
      title: 'Error',
      description: error.message || 'Failed to delete',
      color: 'error'
    })
  } finally {
    showDeleteModal.value = false
    deletingItem.value = null
  }
}

// Handle reorder via API
async function onReorder(updates: { id: string; orderIndex: number; parentId: string | null }[]) {
  try {
    await $fetch(`/api/spaces/${props.spaceId}/items/reorder`, {
      method: 'POST',
      body: { items: updates }
    })
    
    // Reload to get updated order
    await loadItems()
  } catch (error: any) {
    useToast().add({
      title: 'Error',
      description: error.message || 'Failed to reorder',
      color: 'error'
    })
  }
}

// Load on mount
onMounted(() => {
  loadItems()
  
  // Debug: expose query function to window
  if (typeof window !== 'undefined') {
    (window as any).debugSpaceItems = async () => {
      const worker = await pg.init()
      console.log('[DEBUG] Querying space_items for spaceId:', props.spaceId)
      const result = await worker.query(
        'SELECT * FROM space_items WHERE space_id = $1 AND deleted_at IS NULL',
        [props.spaceId]
      )
      console.log('[DEBUG] Raw space_items:', result.rows)
      console.log('[DEBUG] Count:', result.rows.length)
      return result.rows
    }
    console.log('[SpaceItemTree] Debug function available: window.debugSpaceItems()')
  }
})

// Expose reload method
defineExpose({
  reload: loadItems
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-default">
      <span class="text-xs font-semibold uppercase tracking-wider text-dimmed">Items</span>
      <UDropdown
        :items="[
          [{ label: 'New Folder', icon: 'i-lucide-folder', click: () => handleCreate('folder') }],
          [
            { label: 'New Table', icon: 'i-lucide-table', click: () => handleCreate('table') },
            { label: 'New View', icon: 'i-lucide-layout-dashboard', click: () => handleCreate('view') },
            { label: 'New Dashboard', icon: 'i-lucide-bar-chart', click: () => handleCreate('dashboard') }
          ]
        ]"
      >
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-plus"
        />
      </UDropdown>
    </div>

    <!-- Tree Content -->
    <div class="flex-1 overflow-auto py-2">
      <!-- Empty State -->
      <div v-if="!isLoading && treeItems.length === 0" class="flex flex-col items-center justify-center py-8 px-4 text-center">
        <UIcon name="i-lucide-folder-open" class="w-10 h-10 text-dimmed mb-3" />
        <p class="text-sm text-dimmed">No items yet</p>
        <p class="text-xs text-dimmed mt-1">Click + to create your first item</p>
      </div>

      <!-- Loading State -->
      <div v-else-if="isLoading" class="space-y-2 px-3">
        <USkeleton v-for="i in 5" :key="i" class="h-8" />
      </div>

      <!-- Tree Items -->
      <div v-else class="space-y-0.5">
        <SpaceItemTreeNode
          v-for="item in treeItems"
          :key="item.id"
          :item="item"
          :space-id="spaceId"
          :expanded-folders="expandedFolders"
          :selected-id="selectedItemId"
          :highlighted-ids="highlightedItems"
          :just-created-id="justCreatedItemId"
          @toggle="toggleFolder"
          @select="handleSelect"
          @create="handleCreate"
          @rename="handleRename"
          @delete="handleDelete"
          @reorder="onReorder"
        />
      </div>
    </div>

    <!-- Create Folder Modal -->
    <SpaceItemCreateModal
      v-model:open="showCreateFolderModal"
      title="Create Folder"
      icon="i-lucide-folder"
      @confirm="createFolder"
    />

    <!-- Create Item Modal -->
    <SpaceItemCreateModal
      v-model:open="showCreateItemModal"
      :title="`Create ${createItemType.charAt(0).toUpperCase() + createItemType.slice(1)}`"
      :icon="createItemType === 'table' ? 'i-lucide-table' : createItemType === 'view' ? 'i-lucide-layout-dashboard' : 'i-lucide-bar-chart'"
      @confirm="createItem"
    />

    <!-- Rename Modal -->
    <SpaceItemRenameModal
      v-model:open="showRenameModal"
      :item="renamingItem"
      @confirm="confirmRename"
    />

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" title="Delete Item">
      <template #body>
        <p class="text-dimmed">
          Are you sure you want to delete <strong>{{ deletingItem?.name }}</strong>?
          <br>
          <span v-if="deletingItem?.type === 'folder'" class="text-sm">
            Items inside will be moved to the root level.
          </span>
        </p>
      </template>
      <template #footer>
        <UButton color="neutral" variant="ghost" @click="showDeleteModal = false">
          Cancel
        </UButton>
        <UButton color="error" @click="confirmDelete">
          Delete
        </UButton>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.draggable-container {
  min-height: 10px;
}

.ghost-item {
  opacity: 0.5;
  background: var(--color-primary-100);
}

.dragging-item {
  opacity: 0.8;
  background: var(--color-gray-100);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
