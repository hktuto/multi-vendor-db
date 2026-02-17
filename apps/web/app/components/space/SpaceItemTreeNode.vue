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

// Inline editing state
const inlineEditRef = ref<InstanceType<typeof InlineEditableText> | null>(null)
const isEditing = computed(() => inlineEditRef.value?.isEditing ?? false)

// Expose method to trigger edit mode
function startEdit() {
  inlineEditRef.value?.startEdit()
}

defineExpose({
  startEdit,
  isEditing
})

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

// Get icon color
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
  console.log('[SpaceItemTreeNode] Building actionMenuItems for item:', props.item.id, 'type:', props.item.type)
  const items: DropdownMenuItem[][] = []
  
  // Section 1: Create (for folders)
  if (props.item.type === 'folder') {
    items.push([
      { 
        label: 'Add Folder', 
        icon: 'i-lucide-folder-plus', 
        onSelect: () => {
          console.log('[SpaceItemTreeNode] Add Folder clicked, emitting create with parentId:', props.item.id)
          emit('create', 'folder', props.item.id)
        } 
      },
      { 
        label: 'Add Table', 
        icon: 'i-lucide-table', 
        onSelect: () => {
          console.log('[SpaceItemTreeNode] Add Table clicked, emitting create with parentId:', props.item.id)
          emit('create', 'table', props.item.id)
        } 
      },
      { 
        label: 'Add View', 
        icon: 'i-lucide-layout-dashboard', 
        onSelect: () => {
          console.log('[SpaceItemTreeNode] Add View clicked, emitting create with parentId:', props.item.id)
          emit('create', 'view', props.item.id)
        } 
      },
      { 
        label: 'Add Dashboard', 
        icon: 'i-lucide-bar-chart', 
        onSelect: () => {
          console.log('[SpaceItemTreeNode] Add Dashboard clicked, emitting create with parentId:', props.item.id)
          emit('create', 'dashboard', props.item.id)
        } 
      }
    ])
  }
  
  // Section 2: Manage
  const manageItems: DropdownMenuItem[] = [
    { 
      label: 'Edit Name', 
      icon: 'i-lucide-edit-2', 
      onSelect: () => {
        console.log('[SpaceItemTreeNode] Edit Name clicked, starting inline edit')
        startEdit()
      } 
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
  console.log('[SpaceItemTreeNode] Building addSubItemMenu for item:', props.item.id, 'type:', props.item.type)
  return [
    [{ 
      label: 'New Folder', 
      icon: 'i-lucide-folder', 
      onSelect: () => {
        console.log('[SpaceItemTreeNode] New Folder clicked, emitting create with parentId:', props.item.id)
        emit('create', 'folder', props.item.id)
      } 
    }],
    [
      { 
        label: 'New Table', 
        icon: 'i-lucide-table', 
        onSelect: () => {
          console.log('[SpaceItemTreeNode] New Table clicked, emitting create with parentId:', props.item.id)
          emit('create', 'table', props.item.id)
        } 
      },
      { 
        label: 'New View', 
        icon: 'i-lucide-layout-dashboard', 
        onSelect: () => {
          console.log('[SpaceItemTreeNode] New View clicked, emitting create with parentId:', props.item.id)
          emit('create', 'view', props.item.id)
        } 
      },
      { 
        label: 'New Dashboard', 
        icon: 'i-lucide-bar-chart', 
        onSelect: () => {
          console.log('[SpaceItemTreeNode] New Dashboard clicked, emitting create with parentId:', props.item.id)
          emit('create', 'dashboard', props.item.id)
        } 
      }
    ]
  ]
})

// ===== DRAG AND DROP =====
// Handle drag within this folder (reordering only)
async function onChildDragEnd(evt: any) {
  const { newIndex, oldIndex, to, from } = evt
  
  console.log('[SpaceItemTreeNode] Child drag ended:', { newIndex, oldIndex, to, from, folderId: props.item.id })
  
  // Reset dragging flag
  isDragging.value = false
  
  // Only handle reordering within the same list
  // Cross-list moves are handled by @add and @remove
  if (to !== from) {
    console.log('[SpaceItemTreeNode] Cross-list move, skipping onChildDragEnd')
    return
  }
  if (newIndex === oldIndex) {
    console.log('[SpaceItemTreeNode] Same position, no change')
    return
  }
  
  // Build updates for reordering within this folder
  const updates: { id: string; order_index: number; parent_id: string | null }[] = []
  
  // Update all children's order
  childrenForDrag.value.forEach((child, idx) => {
    updates.push({
      id: child.id,
      order_index: idx,
      parent_id: props.item.id
    })
  })
  
  console.log('[SpaceItemTreeNode] Emitting reorder updates for same-folder move:', updates)
  if (updates.length > 0) {
    emit('reorder', updates)
  }
}

function onDragStart(evt: any) {
  isDragging.value = true
  console.log('[SpaceItemTreeNode] Drag started in folder:', props.item.id)
}

// Handle item dragged INTO this folder (from outside)
function onDragAdd(evt: any) {
  const draggedId = evt.item?.__draggable_context?.element?.id || evt.item?.id
  if (!draggedId) {
    console.warn('[SpaceItemTreeNode] onDragAdd: no draggedId found', evt)
    return
  }
  
  const newIndex = evt.newIndex ?? childrenForDrag.value.length
  
  console.log('[SpaceItemTreeNode] Item dragged INTO folder:', props.item.id, 'item:', draggedId, 'at index:', newIndex)
  
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
  
  console.log('[SpaceItemTreeNode] Emitting reorder updates:', updates)
  emit('reorder', updates)
}

// Handle item dragged OUT of this folder - DO NOT emit updates here
// The target folder's onDragAdd will handle the move
function onDragRemove(evt: any) {
  const draggedId = evt.item?.__draggable_context?.element?.id || evt.item?.id
  if (!draggedId) return
  
  console.log('[SpaceItemTreeNode] Item dragged OUT of folder:', props.item.id, 'item:', draggedId)
  // Only reorder remaining children in this folder
  // Note: The actual move is handled by onDragAdd in the target folder
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

      <!-- Item Content (Click to select/open) -->
      <div class="item-content flex-1 min-w-0" @click="selectItem">
        <UIcon
          :name="getIcon(item.type)"
          class="w-4 h-4 flex-shrink-0"
          :class="getIconColor(item.type)"
        />
        <!-- Inline Editable Name -->
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
        <UDropdownMenu
          :items="actionMenuItems"
        >
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
      :class="{ 'min-h-[20px]': childrenForDrag.length === 0 }"
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
            @toggle="$emit('toggle', $event)"
            @select="$emit('select', $event)"
            @create="(type, parentId) => $emit('create', type, parentId)"
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
            @reorder="$emit('reorder', $event)"
          />
        </template>
        
        <!-- Empty slot for folder drop target -->
        <template #footer>
          <div v-if="childrenForDrag.length === 0" class="py-2 px-4 text-xs text-dimmed text-center">
            Drop items here
          </div>
        </template>
      </draggable>
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
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: var(--color-gray-500);
  transition: all 0.15s;
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
}

.item-label {
  font-size: 13px;
  font-weight: 500;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

.folder-children {
  position: relative;
  min-height: 10px;
}

.folder-children::before {
  content: '';
  position: absolute;
  left: 16px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--color-gray-200);
}

.dark .folder-children::before {
  background: var(--color-gray-700);
}

.draggable-container {
  min-height: 10px;
}

/* Dragging styles */
.ghost-item {
  opacity: 0.5;
  background: var(--color-primary-100);
}

.dragging-item {
  opacity: 0.8;
  background: var(--color-gray-100);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Empty drop target */
.min-h-\[20px\] {
  min-height: 20px;
}

/* Animations */
@keyframes flashHighlight {
  0%, 100% { background: transparent; }
  50% { background: var(--color-primary-200); }
}

@keyframes createFlash {
  0% { background: transparent; transform: scale(1); }
  25% { background: var(--color-primary-300); transform: scale(1.02); }
  100% { background: transparent; transform: scale(1); }
}
</style>
