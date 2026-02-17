<script setup lang="ts">
import type { SyncedSpaceItem } from '~/composables/useSpaces'
import { VueDraggableNext } from 'vue-draggable-next'

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
  rename: [item: SyncedSpaceItem]
  delete: [item: SyncedSpaceItem]
  reorder: [updates: { id: string; orderIndex: number; parentId: string | null }[]]
}>()

const level = computed(() => props.level || 0)
const isExpanded = computed(() => props.item.type === 'folder' && props.expandedFolders.has(props.item.id))
const isSelected = computed(() => props.selectedId === props.item.id)
const isHighlighted = computed(() => props.highlightedIds.has(props.item.id))
const isJustCreated = computed(() => props.justCreatedId === props.item.id)

// Draggable children for folders
const draggableChildren = computed({
  get: () => props.item.children || [],
  set: (value) => {
    // Emit reorder event when children change order
    if (props.item.type === 'folder' && value.length > 0) {
      const updates = value.map((child, index) => ({
        id: child.id,
        orderIndex: index,
        parentId: props.item.id
      }))
      emit('reorder', updates)
    }
  }
})

// Get icon based on type
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
        <span class="item-label truncate">{{ item.name }}</span>
      </div>

      <!-- Actions Dropdown -->
      <div class="item-actions opacity-0 group-hover:opacity-100 transition-opacity">
        <!-- Add Button for Folders -->
        <UDropdown
          v-if="item.type === 'folder'"
          :items="[
            [{ label: 'New Folder', icon: 'i-lucide-folder', click: () => emit('create', 'folder', item.id) }],
            [
              { label: 'New Table', icon: 'i-lucide-table', click: () => emit('create', 'table', item.id) },
              { label: 'New View', icon: 'i-lucide-layout-dashboard', click: () => emit('create', 'view', item.id) },
              { label: 'New Dashboard', icon: 'i-lucide-bar-chart', click: () => emit('create', 'dashboard', item.id) }
            ]
          ]"
        >
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-plus"
            class="h-6 w-6"
            @click.stop
          />
        </UDropdown>

        <!-- Item Actions -->
        <UDropdown
          :items="[
            [{ label: 'Rename', icon: 'i-lucide-edit-2', click: () => emit('rename', item) }],
            [{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error', click: () => emit('delete', item) }]
          ]"
        >
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-more-horizontal"
            class="h-6 w-6"
            @click.stop
          />
        </UDropdown>
      </div>
    </div>

    <!-- Folder Children with Drag and Drop -->
    <div
      v-if="item.type === 'folder' && isExpanded && item.children?.length"
      class="folder-children"
    >
      <VueDraggableNext
        v-model="draggableChildren"
        :group="{ name: 'space-items', pull: true, put: true }"
        ghost-class="ghost-item"
        drag-class="dragging-item"
        class="draggable-container"
        item-key="id"
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
            @rename="$emit('rename', $event)"
            @delete="$emit('delete', $event)"
            @reorder="$emit('reorder', $event)"
          />
        </template>
      </VueDraggableNext>
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
