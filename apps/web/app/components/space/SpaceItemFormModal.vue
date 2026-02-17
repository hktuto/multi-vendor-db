<script setup lang="ts">
import type { SyncedSpaceItem } from '~/composables/useSpaces'

type ItemType = 'folder' | 'table' | 'view' | 'dashboard'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  type: ItemType
  item?: SyncedSpaceItem | null
  parentId?: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [data: {
    name: string
    description?: string
    icon?: string
    color?: string
    config?: Record<string, any>
  }]
}>()

// Form state
const form = reactive({
  name: '',
  description: '',
  icon: '',
  color: '#3b82f6',
  config: {} as Record<string, any>
})

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

// Reset form when opening
watch(() => props.open, (val) => {
  if (val) {
    if (props.mode === 'edit' && props.item) {
      form.name = props.item.name
      form.description = props.item.description || ''
      form.icon = props.item.icon || ''
      form.color = props.item.color || '#3b82f6'
      form.config = { ...props.item.config } || {}
    } else {
      form.name = ''
      form.description = ''
      form.icon = getDefaultIcon(props.type)
      form.color = '#3b82f6'
      form.config = getDefaultConfig(props.type)
    }
  }
})

function getDefaultIcon(type: ItemType): string {
  const icons: Record<ItemType, string> = {
    folder: '📁',
    table: '📊',
    view: '👁️',
    dashboard: '📈'
  }
  return icons[type]
}

function getDefaultConfig(type: ItemType): Record<string, any> {
  switch (type) {
    case 'folder':
      return { isExpanded: true }
    case 'table':
      return { schemaId: null, defaultView: 'grid' }
    case 'view':
      return { tableId: null, filters: [], sorts: [] }
    case 'dashboard':
      return { widgets: [], layout: 'grid' }
    default:
      return {}
  }
}

function getTitle(): string {
  const action = props.mode === 'create' ? 'Create' : 'Edit'
  const types: Record<ItemType, string> = {
    folder: 'Folder',
    table: 'Table',
    view: 'View',
    dashboard: 'Dashboard'
  }
  return `${action} ${types[props.type]}`
}

function getIcon(): string {
  const icons: Record<ItemType, string> = {
    folder: 'i-lucide-folder',
    table: 'i-lucide-table',
    view: 'i-lucide-layout-dashboard',
    dashboard: 'i-lucide-bar-chart'
  }
  return icons[props.type]
}

// Icon options
const iconOptions = [
  { value: '📁', label: '📁 Folder' },
  { value: '📂', label: '📂 Open Folder' },
  { value: '📊', label: '📊 Chart' },
  { value: '📈', label: '📈 Trend' },
  { value: '📉', label: '📉 Down' },
  { value: '📋', label: '📋 Clipboard' },
  { value: '📝', label: '📝 Note' },
  { value: '👁️', label: '👁️ View' },
  { value: '🔍', label: '🔍 Search' },
  { value: '⚙️', label: '⚙️ Settings' },
  { value: '🎯', label: '🎯 Target' },
  { value: '💡', label: '💡 Idea' },
  { value: '🔔', label: '🔔 Bell' },
  { value: '🏷️', label: '🏷️ Tag' },
  { value: '🗂️', label: '🗂️ Index' },
  { value: '📅', label: '📅 Calendar' },
  { value: '⏰', label: '⏰ Clock' },
  { value: '🚀', label: '🚀 Rocket' },
  { value: '🔬', label: '🔬 Lab' },
  { value: '🏭', label: '🏭 Factory' }
]

// Color presets
const colorPresets = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#84cc16'  // lime
]

function handleSubmit() {
  if (!form.name.trim()) return
  
  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    icon: form.icon || undefined,
    color: form.color,
    config: form.config
  })
  
  isOpen.value = false
}

function handleClose() {
  isOpen.value = false
}

// Table schema options (mock for now)
const schemaOptions = [
  { value: null, label: 'Default Schema' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'customers', label: 'Customers' },
  { value: 'products', label: 'Products' }
]

// View table options (mock for now)
const tableOptions = [
  { value: null, label: 'Select a table...' },
  { value: 'table1', label: 'Sprint 1 Tasks' },
  { value: 'table2', label: 'Bug Tracker' },
  { value: 'table3', label: 'Customers' }
]

// Dashboard layout options
const layoutOptions = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'free', label: 'Freeform' }
]
</script>

<template>
  <UModal v-model:open="isOpen" :title="getTitle()" :icon="getIcon()" @close="handleClose">
    <template #body>
      <div class="space-y-4">
        <!-- Common Fields -->
        <UFormField label="Name" required>
          <UInput
            v-model="form.name"
            placeholder="Enter name"
            autofocus
            @keyup.enter="handleSubmit"
          />
        </UFormField>

        <UFormField label="Description">
          <UTextarea
            v-model="form.description"
            placeholder="Enter description (optional)"
            :rows="2"
          />
        </UFormField>

        <!-- Icon & Color for all types -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Icon">
            <USelect
              v-model="form.icon"
              :items="iconOptions"
              placeholder="Select icon"
            />
          </UFormField>

          <UFormField label="Color">
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="color in colorPresets"
                :key="color"
                type="button"
                class="w-6 h-6 rounded-full border-2 transition-all"
                :class="form.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
                :style="{ backgroundColor: color }"
                @click="form.color = color"
              />
              <input
                v-model="form.color"
                type="color"
                class="w-6 h-6 rounded-full cursor-pointer border-0 p-0"
              />
            </div>
          </UFormField>
        </div>

        <!-- Type-specific fields -->
        
        <!-- Folder specific -->
        <template v-if="type === 'folder'">
          <UFormField>
            <UCheckbox
              v-model="form.config.isExpanded"
              label="Expanded by default"
            />
          </UFormField>
        </template>

        <!-- Table specific -->
        <template v-if="type === 'table'">
          <UFormField label="Schema">
            <USelect
              v-model="form.config.schemaId"
              :items="schemaOptions"
            />
          </UFormField>
          
          <UFormField label="Default View">
            <USelect
              v-model="form.config.defaultView"
              :items="[
                { value: 'grid', label: 'Grid' },
                { value: 'list', label: 'List' },
                { value: 'kanban', label: 'Kanban' },
                { value: 'calendar', label: 'Calendar' }
              ]"
            />
          </UFormField>
        </template>

        <!-- View specific -->
        <template v-if="type === 'view'">
          <UFormField label="Source Table" required>
            <USelect
              v-model="form.config.tableId"
              :items="tableOptions"
            />
          </UFormField>
          
          <UFormField>
            <UCheckbox
              v-model="form.config.isPublic"
              label="Public view (visible to all members)"
            />
          </UFormField>
        </template>

        <!-- Dashboard specific -->
        <template v-if="type === 'dashboard'">
          <UFormField label="Layout">
            <USelect
              v-model="form.config.layout"
              :items="layoutOptions"
            />
          </UFormField>
          
          <UFormField>
            <UCheckbox
              v-model="form.config.isDefault"
              label="Set as default dashboard"
            />
          </UFormField>
        </template>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="handleClose">
        Cancel
      </UButton>
      <UButton color="primary" :disabled="!form.name.trim()" @click="handleSubmit">
        {{ mode === 'create' ? 'Create' : 'Save' }}
      </UButton>
    </template>
  </UModal>
</template>
