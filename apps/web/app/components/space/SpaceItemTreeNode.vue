<script setup lang="ts">
import type { SyncedSpaceItem } from '~/composables/useSpaces'
import type { DropdownMenuItem } from '@nuxt/ui'
import draggable from 'vuedraggable'
import InlineEditableText from '~/components/InlineEditableText.vue'

const props = defineProps<{
  item: SyncedSpaceItem & { children?: any[]; level?: number }
  spaceId: string
  expandedFolders: Set<string>
  selectedId: string | null
  highlightedIds: Set<string>
  justCreatedId: string | null
  level?: number
}>()

const emit = defineEmits<{
  toggle: [folderId: string]
  select: [item: SyncedSpaceItem, event?: MouseEvent]
  create: [type: 'folder' | 'table' | 'view' | 'dashboard', parentId?: string | null]
  edit: [item: SyncedSpaceItem]
  rename: [itemId: string, newName: string]
  delete: [item: SyncedSpaceItem]
  reorder: [updates: { id: string; order_index: number; parent_id: string | null }[]]
}>()

const level = computed(() => props.level || 0)
const isExpanded = computed(() => props.item.type === 'folder' && props.expandedFolders.has(props.item.id))
const isSelected = computed(() => props.selectedId === props.item.id)
const isHighlighted = computed(() => props.highlightedIds.has(props.item.id))
const isJustCreated = computed(() => props.justCreatedId === props.item.id)

// Writable children for drag
const childrenForDrag = ref<SyncedSpaceItem[]>([])
const isDragging = ref(false)

// Sync with parent provided children (but not during drag)
watch(() => props.item.children, (newChildren) => {
  if (!isDragging.value) {
    childrenForDrag.value = newChildren ? [...newChildren] : []
  }
}, { immediate: true, deep: true })

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

// Toggle folder
function toggleFolder() {
  if (props.item.type === 'folder') {
    emit('toggle', props.item.id)
  }
}

// Select item
function selectItem(event?: MouseEvent) {
  emit('select', props.item, event)
}

// ===== ACTIONS MENU =====
const actionMenuItems = computed<DropdownMenuItem[][]>(() => {
  const items: DropdownMenuItem[][] = []
  
  // Section 1: Create (for folders)
  if (props.item.type === 'folder') {
    items.push([
      { 
        label: 'Add Folder', 
        icon: 'i-lucide-folder-plus', 
        onSelect: () => emit('create', 'folder', props.item.id)
      },
      { 
        label: 'Add Table', 
        icon: 'i-lucide-table', 
        onSelect: () => emit('create', 'table', props.item.id)
      },
      { 
        label: 'Add View', 
        icon: 'i-lucide-layout-dashboard', 
        onSelect: () => emit('create', 'view', props.item.id)
      },
      { 
        label: 'Add Dashboard', 
        icon: 'i-lucide-bar-chart', 
        onSelect: () => emit('create', 'dashboard', props.item.id)
      }
    ])
  }
  
  // Section 2: Manage
  const manageItems: DropdownMenuItem[] = [
    { 
      label: 'Edit Name', 
      icon: 'i-lucide-edit-2', 
      onSelect: () => startEdit()
    },
    { label: 'Settings', icon: 'i-lucide-settings', onSelect: () => emit('edit', props.item) }
  ]
  
  // Type-specific actions
  if (props.item.type === 'table') {
    manageItems.push({ label: 'Manage Fields', icon: 'i-lucide-columns', onSelect: () => {} })
  } else if (props.item.type === 'view') {
    manageItems.push({ label: 'Edit Filters', icon: 'i-lucide-filter', onSelect: () => {} })
  } else if (props.item.type === 'dashboard') {
    manageItems.push({ label: 'Edit Widgets', icon: 'i-lucide-layout', onSelect: () => {} })
  }
  
  items.push(manageItems)
  
  // Section 3: Danger
  items.push([
    { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => emit('delete', props.item) }
  ])
  
  return items
})

// Add sub-item menu (for folder hover)
const addSubItemMenu = computed<DropdownMenuItem[][]>(() => {
  return [
    [{ 
      label: 'New Folder', 
      icon: 'i-lucide-folder', 
      onSelect: () => emit('create', 'folder', props.item.id)
    }],
    [
      { 
        label: 'New Table', 
        icon: 'i-lucide-table', 
        onSelect: () => emit('create', 'table', props.item.id)
      },
      { 
        label: 'New View', 
        icon: 'i-lucide-layout-dashboard', 
        onSelect: () => emit('create', 'view', props.item.id)
      },
      { 
        label: 'New Dashboard', 
        icon: 'i-lucide-bar-chart', 
        onSelect: () => emit('create', 'dashboard', props.item.id)
      }
    ]
  ]
})

// Inline editing
const inlineEditRef = ref<InstanceType<typeof InlineEditableText> | null>(null)

function startEdit() {
  inlineEditRef.value?.startEdit()
}

defineExpose({
  startEdit
})

// ===== DRAG AND DROP =====
function onDragStart() {
  isDragging.value = true
}

// Handle drag within this folder (reordering only)
async function onChildDragEnd(evt: any) {
  const { newIndex, oldIndex, to, from } = evt
  
  isDragging.value = false
  
  // Cross-list move is handled by @add and @remove
  if (to !== from) {
    return
  }
  
  // Same position, no change
  if (newIndex === oldIndex) {
    return
  }
  
  // Build updates for reordering within this folder
  const updates: { id: string; order_index: number; parent_id: string | null }[] = []
  
  childrenForDrag.value.forEach((child, idx) => {
    updates.push({
      id: child.id,
      order_index: idx,
      parent_id: props.item.id
    })
  })
  
  if (updates.length > 0) {
    console.log('[DRAG] Reordering within folder:', props.item.id, updates.map(u => ({ id: u.id, order: u.order_index })))
    emit('reorder', updates)
  }
}

// Handle item dragged INTO this folder (from outside)
async function onDragAdd(evt: any) {
  const draggedId = evt.item?.__draggable_context?.element?.id || evt.item?.id
  if (!draggedId) return
  
  const newIndex = evt.newIndex ?? childrenForDrag.value.length
  
  console.log('[DRAG] Item dragged INTO folder:', { folderId: props.item.id, draggedId, newIndex })
  
  // Build updates: move dragged item to this folder + reorder all children
  const updates: { id: string; order_index: number; parent_id: string | null }[] = []
  
  // Add the dragged item with new parent
  updates.push({
    id: draggedId,
    order_index: newIndex,
    parent_id: props.item.id
  })
  
  // Reorder existing children (excluding the dragged item)
  childrenForDrag.value.forEach((child, idx) => {
    if (child.id !== draggedId) {
      const orderIndex = idx >= newIndex ? idx + 1 : idx
      updates.push({
        id: child.id,
        order_index: orderIndex,
        parent_id: props.item.id
      })
    }
  })
  
  console.log('[DRAG] Emitting move to folder:', updates.map(u => ({ id: u.id, parent: u.parent_id, order: u.order_index })))
  emit('reorder', updates)
}

// Handle item dragged OUT of this folder
function onDragRemove(evt: any) {
  const draggedId = evt.item?.__draggable_context?.element?.id || evt.item?.id
  if (!draggedId) return
  
  console.log('[DRAG] Item dragged OUT of folder:', { folderId: props.item.id, draggedId })
  
  // Reorder remaining children
  const updates: { id: string; order_index: number; parent_id: string | null }[] = []
  
  childrenForDrag.value
    .filter(child => child.id !== draggedId)
    .forEach((child, idx) => {
      updates.push({
        id: child.id,
        order_index: idx,
        parent_id: props.item.id
      })
    })
  
  if (updates.length > 0) {
    console.log('[DRAG] Reordering remaining children:', updates.map(u => ({ id: u.id, order: u.order_index })))
    emit('reorder', updates)
  }
}
</script>

<template>
  <div class="menu-item-wrapper">
    <!-- Item Row -->
    <div
      class="menu-item group"
      :class="{
        'active': isSelected,
        'folder': item.type === 'folder',
        'expanded': isExpanded,
        'highlighted': isHighlighted,
        'just-created': isJustCreated
      }"
      :style="{ paddingLeft: `${12 + level * 12}px` }"
    >
      <!-- Folder Toggle -->
      <button
        v-if="item.type === 'folder'"
        class="folder-toggle"
        @click.stop="toggleFolder"
      >
        <UIcon
          :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="w-3.5 h-3.5"
        />
      </button>
      <span v-else class="w-5" />

      <!-- Item Content -->
      <div class="item-content flex-1 min-w-0" @click="selectItem">
        <UIcon
          :name="getIcon(item.type)"
          class="w-4 h-4 flex-shrink-0"
          :class="getIconColor(item.type)"
        />
        <InlineEditableText
          ref="inlineEditRef"
          v-model="item.name"
          :placeholder="item.type === 'folder' ? 'Folder name' : 'Item name'"
          :disabled="false"
          text-class="item-label truncate"
          input-class="w-full"
          @save="(newName) => emit('rename', item.id, newName)"
        />
      </div>

      <!-- Actions -->
      <div class="item-actions opacity-0 group-hover:opacity-100 transition-opacity">
        <!-- Quick Add Button (Folder only) -->
        <UDropdownMenu
          v-if="item.type === 'folder'"
          :items="addSubItemMenu"
        >
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-plus"
            class="h-6 w-6"
            @click.stop
          />
        </UDropdownMenu>

        <!-- More Actions -->
        <UDropdownMenu :items="actionMenuItems">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-more-horizontal"
            class="h-6 w-6"
            @click.stop
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Folder Children with Drag and Drop -->
    <div
      v-if="item.type === 'folder' && isExpanded"
      class="folder-children"
    >
      <draggable
        v-model="childrenForDrag"
        :group="{ name: 'space-items', pull: true, put: true }"
        ghost-class="ghost-item"
        drag-class="dragging-item"
        class="draggable-container"
        item-key="id"
        @start="onDragStart"
        @end="onChildDragEnd"
        @add="onDragAdd"
        @remove="onDragRemove"
      >
        <template #item="{ element: childItem }">
          <SpaceItemTreeNode
            :item="childItem"
            :space-id="spaceId"
            :expanded-folders="expandedFolders"
            :selected-id="selectedId"
            :highlighted-ids="highlightedIds"
            :just-created-id="justCreatedId"
            :level="level + 1"
            @toggle="(id) => $emit('toggle', id)"
            @select="(item, e) => $emit('select', item, e)"
            @create="(type, parentId) => $emit('create', type, parentId)"
            @edit="(item) => $emit('edit', item)"
            @rename="(id, name) => $emit('rename', id, name)"
            @delete="(item) => $emit('delete', item)"
            @reorder="(updates) => $emit('reorder', updates)"
          />
        </template>
      </draggable>
      
      <!-- Empty State for Drop Target -->
      <div 
        v-if="childrenForDrag.length === 0" 
        class="py-4 px-4 text-xs text-dimmed text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded m-2"
      >
        Drop items here
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-item-wrapper {
  position: relative;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px 6px 12px;
  margin: 0 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.menu-item:hover {
  background: var(--color-gray-100);
}

.dark .menu-item:hover {
  background: var(--color-gray-800);
}

.menu-item.active {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.dark .menu-item.active {
  background: var(--color-primary-900);
  color: var(--color-primary-300);
}

.menu-item.highlighted {
  animation: flashHighlight 0.5s ease-out;
}

.menu-item.just-created {
  animation: createFlash 1.5s ease-out;
}

.folder-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  transition: background 0.15s;
}

.folder-toggle:hover {
  background: var(--color-gray-200);
}

.dark .folder-toggle:hover {
  background: var(--color-gray-700);
}

.item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.item-label {
  font-size: 14px;
  font-weight: 500;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.folder-children {
  position: relative;
}

.draggable-container {
  min-height: 20px;
}

.ghost-item {
  opacity: 0.5;
  background: var(--color-primary-100);
  border: 2px dashed var(--color-primary-300);
}

.dragging-item {
  opacity: 0.8;
  background: var(--color-gray-100);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@keyframes flashHighlight {
  0% { background: var(--color-primary-200); }
  100% { background: transparent; }
}

@keyframes createFlash {
  0%, 100% { background: transparent; }
  50% { background: var(--color-primary-100); }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.menu-item-wrapper {
  animation: slideIn 0.2s ease-out;
}
</style>