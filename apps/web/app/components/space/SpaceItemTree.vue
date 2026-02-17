<script setup lang="ts">
import type { SyncedSpaceItem } from '~/composables/useSpaces'
import { useSpaceItems } from '~/composables/useSpaceItems'
import type { DropdownMenuItem } from '@nuxt/ui'
import draggable from 'vuedraggable'

const props = defineProps<{
  spaceId: string
}>()

const emit = defineEmits<{
  select: [item: SyncedSpaceItem]
}>()

// Use space items composable (optimistic)
const spaceItems = useSpaceItems()

// Local UI state
const expandedFolders = ref<Set<string>>(new Set())
const highlightedItems = ref<Set<string>>(new Set())
const justCreatedItemId = ref<string | null>(null)
const selectedItemId = ref<string | null>(null)

// Form Modal
const showFormModal = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formType = ref<'folder' | 'table' | 'view' | 'dashboard'>('folder')
const formItem = ref<SyncedSpaceItem | null>(null)
const formParentId = ref<string | null>(null)

// Delete Modal
const showDeleteModal = ref(false)
const deletingItem = ref<SyncedSpaceItem | null>(null)

// Computed items for this space
const items = computed(() => spaceItems.getSpaceItems(props.spaceId))
const rootItems = computed(() => spaceItems.getRootItems(props.spaceId))
const isLoading = computed(() => spaceItems.isSpaceLoading(props.spaceId))

// Writable root items for drag
const rootItemsForDrag = ref<SyncedSpaceItem[]>([])
const isDragging = ref(false)

// Sync rootItemsForDrag with computed rootItems (but not during drag)
watch(() => rootItems.value, (newItems) => {
  if (!isDragging.value) {
    rootItemsForDrag.value = [...newItems]
  }
}, { immediate: true, deep: true })

// Watch for temp items that need to enter edit mode after render
watch(() => rootItems.value, async () => {
  if (tempItemIdToEdit.value) {
    // Wait for DOM update
    await nextTick()
    // Small delay to ensure component is fully mounted
    setTimeout(() => {
      const nodeRef = treeNodeRefs.value[tempItemIdToEdit.value!]
      if (nodeRef) {
        console.log('[SpaceItemTree] Triggering edit mode for:', tempItemIdToEdit.value)
        nodeRef.startEdit()
      }
      tempItemIdToEdit.value = null
    }, 100)
  }
}, { flush: 'post' })

// Load items on mount
onMounted(async () => {
  // Load from local DB
  await spaceItems.loadItems(props.spaceId)
  // Subscribe to Electric changes
  await spaceItems.subscribeToItems(props.spaceId)
  // Expand all folders by default
  expandAllFolders()
})

// Cleanup on unmount
onUnmounted(() => {
  spaceItems.unsubscribe()
})

function expandAllFolders() {
  items.value.forEach(item => {
    if (item.type === 'folder') expandedFolders.value.add(item.id)
  })
}

function toggleFolder(folderId: string) {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  } else {
    expandedFolders.value.add(folderId)
  }
}

function handleSelect(item: SyncedSpaceItem) {
  selectedItemId.value = item.id
  emit('select', item)
  // For folders, also expand them when selected
  if (item.type === 'folder') {
    expandedFolders.value.add(item.id)
  }
}

// ===== CREATE / EDIT =====
function openCreateModal(type: 'folder' | 'table' | 'view' | 'dashboard', parentId?: string | null) {
  console.log('[SpaceItemTree] openCreateModal called:', { type, parentId })
  formMode.value = 'create'
  formType.value = type
  formParentId.value = parentId || null
  formItem.value = null
  showFormModal.value = true
}

// Quick create folder - creates immediately and enters edit mode
async function quickCreateFolder(parentId?: string | null) {
  console.log('[SpaceItemTree] quickCreateFolder called:', { parentId })
  try {
    // Create folder with default name
    const newItem = await spaceItems.createItem(props.spaceId, {
      type: 'folder',
      name: 'New Folder',
      parent_id: parentId
    })
    
    console.log('[SpaceItemTree] Quick folder created:', newItem)
    
    // Expand parent folder
    if (parentId) {
      expandedFolders.value.add(parentId)
    }
    
    // Track this item to enter edit mode after render
    tempItemIdToEdit.value = newItem.id
    
    // Highlight the new item
    justCreatedItemId.value = newItem.id
    highlightedItems.value.add(newItem.id)
    setTimeout(() => {
      highlightedItems.value.delete(newItem.id)
    }, 1500)
    
    useToast().add({
      title: 'Success',
      description: 'New folder created - type to rename',
      color: 'success'
    })
  } catch (error: any) {
    console.error('[SpaceItemTree] Failed to create folder:', error)
    useToast().add({
      title: 'Error',
      description: error.message || 'Failed to create folder',
      color: 'error'
    })
  }
}

// Handle rename from inline editing
async function handleRename(itemId: string, newName: string) {
  console.log('[SpaceItemTree] handleRename:', { itemId, newName })
  try {
    if (!newName.trim()) {
      // If empty name, reload to restore original
      await spaceItems.loadItems(props.spaceId)
      return
    }
    
    await spaceItems.updateItem(props.spaceId, itemId, { name: newName })
    console.log('[SpaceItemTree] Rename successful')
  } catch (error: any) {
    console.error('[SpaceItemTree] Rename failed:', error)
    useToast().add({
      title: 'Error',
      description: error.message || 'Failed to rename',
      color: 'error'
    })
    // Reload to restore original name
    await spaceItems.loadItems(props.spaceId)
  }
}

function openEditModal(item: SyncedSpaceItem) {
  formMode.value = 'edit'
  formType.value = item.type
  formItem.value = item
  formParentId.value = item.parent_id
  showFormModal.value = true
}

async function handleFormSubmit(data: {
  name: string
  description?: string
  icon?: string
  color?: string
  config?: Record<string, any>
}) {
  console.log('[SpaceItemTree] handleFormSubmit:', { mode: formMode.value, type: formType.value, parentId: formParentId.value, data })
  try {
    if (formMode.value === 'create') {
      // Optimistic create - local state updates immediately
      const newItem = await spaceItems.createItem(props.spaceId, {
        type: formType.value,
        ...data,
        parent_id: formParentId.value
      })
      
      console.log('[SpaceItemTree] Created item:', newItem)
      
      // Highlight new item
      justCreatedItemId.value = newItem.id
      highlightedItems.value.add(newItem.id)
      setTimeout(() => {
        highlightedItems.value.delete(newItem.id)
        justCreatedItemId.value = null
      }, 1500)
      
      handleSelect(newItem)
      
      useToast().add({
        title: 'Success',
        description: `${formType.value} "${data.name}" created`,
        color: 'success'
      })
    } else if (formMode.value === 'edit' && formItem.value) {
      // Optimistic update
      await spaceItems.updateItem(props.spaceId, formItem.value.id, data)
      
      useToast().add({
        title: 'Success',
        description: 'Item updated successfully',
        color: 'success'
      })
    }
  } catch (error: any) {
    useToast().add({
      title: 'Error',
      description: error.message || `Failed to ${formMode.value} item`,
      color: 'error'
    })
  }
}

// ===== DELETE =====
function handleDelete(item: SyncedSpaceItem) {
  deletingItem.value = item
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!deletingItem.value) return
  
  try {
    // Optimistic delete - removes from UI immediately
    await spaceItems.deleteItem(props.spaceId, deletingItem.value.id)
    
    useToast().add({ title: 'Success', description: 'Item deleted', color: 'success' })
  } catch (error: any) {
    useToast().add({ title: 'Error', description: error.message || 'Failed to delete', color: 'error' })
  } finally {
    showDeleteModal.value = false
    deletingItem.value = null
  }
}

// ===== DRAG AND DROP =====
// Track items being dragged between lists
const draggedItemInfo = ref<{ id: string; fromParentId: string | null } | null>(null)

// Refs to tree node components for triggering edit mode
const treeNodeRefs = ref<Record<string, InstanceType<typeof SpaceItemTreeNode>>>({})

// Track temp items that need to enter edit mode after creation
const tempItemIdToEdit = ref<string | null>(null)

function onDragStart(evt: any) {
  isDragging.value = true
  console.log('[SpaceItemTree] Drag started')
}

async function onDragEnd(evt: any) {
  const { newIndex, oldIndex, to, from, item: draggedElement } = evt
  
  console.log('[SpaceItemTree] Drag ended:', { newIndex, oldIndex, to, from })
  
  // Reset dragging flag after a short delay to allow watchers to update
  setTimeout(() => {
    isDragging.value = false
  }, 100)
  
  // If moved within same list and same position, do nothing
  if (to === from && newIndex === oldIndex) {
    console.log('[SpaceItemTree] Same position, no change needed')
    return
  }
  
  const draggedId = draggedElement.__draggable_context?.element?.id
  if (!draggedId) {
    console.warn('[SpaceItemTree] No draggedId found')
    return
  }
  
  // Determine new parent (null for root level)
  const newParentId = null
  
  console.log('[SpaceItemTree] Moving item:', draggedId, 'to root at index:', newIndex)
  
  try {
    // Optimistic reorder - updates UI immediately
    await spaceItems.handleDragEnd(props.spaceId, draggedId, newParentId, newIndex)
    console.log('[SpaceItemTree] Drag operation successful')
  } catch (error: any) {
    console.error('[SpaceItemTree] Drag operation failed:', error)
    useToast().add({ title: 'Error', description: error.message || 'Failed to reorder', color: 'error' })
    // Revert by reloading
    await spaceItems.loadItems(props.spaceId)
  }
}

// Handle item dragged INTO root from elsewhere
function onDragAdd(evt: any) {
  const draggedId = evt.item?.__draggable_context?.element?.id || evt.item?.id
  if (!draggedId) {
    console.warn('[SpaceItemTree] onDragAdd: no draggedId found')
    return
  }
  
  const newIndex = evt.newIndex
  
  console.log('[SpaceItemTree] Item dragged INTO root:', draggedId, 'at index:', newIndex)
  
  // Immediately update the parent_id for the dragged item
  spaceItems.handleDragEnd(props.spaceId, draggedId, null, newIndex).catch((error: any) => {
    console.error('[SpaceItemTree] Failed to move item to root:', error)
    useToast().add({ title: 'Error', description: error.message || 'Failed to move item', color: 'error' })
  })
}

// Handle child reorder from nested folders
async function onChildReorder(updates: { id: string; order_index: number; parent_id: string | null }[]) {
  console.log('[SpaceItemTree] onChildReorder called with updates:', updates)
  try {
    await spaceItems.reorderItems(props.spaceId, updates)
    console.log('[SpaceItemTree] Reorder successful')
  } catch (error: any) {
    console.error('[SpaceItemTree] Reorder failed:', error)
    useToast().add({ title: 'Error', description: error.message || 'Failed to reorder', color: 'error' })
  }
}

function getItemChildren(parentId: string): SyncedSpaceItem[] {
  return spaceItems.getItemChildren(props.spaceId, parentId)
}

// ===== ROOT LEVEL ADD MENU =====
const rootAddMenuItems = computed<DropdownMenuItem[][]>(() => [
  [{
    label: 'New Folder',
    icon: 'i-lucide-folder',
    onSelect: () => quickCreateFolder()
  }],
  [
    { label: 'New Table', icon: 'i-lucide-table', onSelect: () => openCreateModal('table') },
    { label: 'New View', icon: 'i-lucide-layout-dashboard', onSelect: () => openCreateModal('view') },
    { label: 'New Dashboard', icon: 'i-lucide-bar-chart', onSelect: () => openCreateModal('dashboard') }
  ]
])

// Expose reload method
defineExpose({
  reload: () => spaceItems.loadItems(props.spaceId)
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header with Add Button -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-default">
      <span class="text-xs font-semibold uppercase tracking-wider text-dimmed">Items</span>
      
      <UDropdownMenu :items="rootAddMenuItems">
        <UButton
          color="primary"
          variant="soft"
          size="xs"
          icon="i-lucide-plus"
        />
      </UDropdownMenu>
    </div>

    <!-- Tree Content -->
    <div class="flex-1 overflow-auto py-2">
      <!-- Empty State -->
      <div v-if="!isLoading && rootItemsForDrag.length === 0" class="flex flex-col items-center justify-center py-8 px-4 text-center">
        <UIcon name="i-lucide-folder-open" class="w-10 h-10 text-dimmed mb-3" />
        <p class="text-sm text-dimmed">No items yet</p>
        <p class="text-xs text-dimmed mt-1">Click + to create your first item</p>
      </div>

      <!-- Loading State -->
      <div v-else-if="isLoading" class="space-y-2 px-3">
        <USkeleton v-for="i in 5" :key="i" class="h-8" />
      </div>

      <!-- Tree Items with Drag and Drop -->
      <draggable
        v-else
        v-model="rootItemsForDrag"
        :group="{ name: 'space-items', pull: true, put: true }"
        ghost-class="ghost-item"
        drag-class="dragging-item"
        class="draggable-container"
        item-key="id"
        @start="onDragStart"
        @end="onDragEnd"
        @add="onDragAdd"
      >
        <template #item="{ element: item }">
          <SpaceItemTreeNode
            ref="(el) => { if (el) treeNodeRefs[item.id] = el }"
            :item="{ ...item, children: getItemChildren(item.id) }"
            :space-id="spaceId"
            :expanded-folders="expandedFolders"
            :selected-id="selectedItemId"
            :highlighted-ids="highlightedItems"
            :just-created-id="justCreatedItemId"
            @toggle="toggleFolder"
            @select="handleSelect"
            @create="(type, parentId) => type === 'folder' ? quickCreateFolder(parentId) : openCreateModal(type, parentId)"
            @edit="openEditModal"
            @rename="handleRename"
            @delete="handleDelete"
            @reorder="onChildReorder"
          />
        </template>
      </draggable>
    </div>

    <!-- Form Modal -->
    <SpaceItemFormModal
      v-model:open="showFormModal"
      :mode="formMode"
      :type="formType"
      :item="formItem"
      :parent-id="formParentId"
      @submit="handleFormSubmit"
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
        <UButton color="neutral" variant="ghost" @click="showDeleteModal = false">Cancel</UButton>
        <UButton color="error" @click="confirmDelete">Delete</UButton>
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
