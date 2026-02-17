<script setup lang="ts">
import { useSpaceItems } from '~/composables/useSpaceItems'

const props = defineProps<{
  modelValue: boolean
  itemId: string
  spaceId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const spaceItems = useSpaceItems()
const toast = useToast()

// Tabs
const activeTab = ref('general')
const tabs = [
  { id: 'general', label: '一般', icon: 'i-lucide-settings' },
  { id: 'columns', label: '顯示欄位', icon: 'i-lucide-columns' },
  { id: 'filters', label: '篩選與排序', icon: 'i-lucide-filter' },
  { id: 'permissions', label: '權限', icon: 'i-lucide-shield' },
  { id: 'rowPermissions', label: 'Row 權限', icon: 'i-lucide-lock', disabled: true }
]

// Load item data
const { data: item, pending } = await useFetch(`/api/space-items/${props.itemId}`)

// Form data
const form = ref({
  name: '',
  description: '',
  icon: '',
  color: ''
})

// Watch for item changes
watch(() => item.value, (newItem) => {
  if (newItem) {
    form.value = {
      name: newItem.name,
      description: newItem.description || '',
      icon: newItem.icon || '',
      color: newItem.color || ''
    }
  }
}, { immediate: true })

// Colors
const colors = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Yellow' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#84cc16', label: 'Lime' }
]

// Icons
const icons = [
  { value: '📊', label: 'Chart' },
  { value: '📋', label: 'List' },
  { value: '📦', label: 'Box' },
  { value: '📅', label: 'Calendar' },
  { value: '👥', label: 'People' },
  { value: '✅', label: 'Check' },
  { value: '🎯', label: 'Target' },
  { value: '📝', label: 'Note' }
]

// Save general settings
async function saveGeneral() {
  try {
    await spaceItems.updateItem(props.spaceId, props.itemId, {
      name: form.value.name,
      description: form.value.description,
      icon: form.value.icon,
      color: form.value.color
    })
    toast.add({
      title: 'Success',
      description: '設置已保存',
      color: 'success'
    })
    emit('update:modelValue', false)
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || '保存失敗',
      color: 'error'
    })
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <UModal
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :ui="{ width: 'max-w-4xl' }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <span class="text-lg font-semibold">Table 設置</span>
        <UBadge v-if="item" variant="soft" size="sm">{{ item.name }}</UBadge>
      </div>
    </template>

    <div v-if="pending" class="p-8 flex justify-center">
      <ULoadingSpinner size="lg" />
    </div>

    <div v-else class="flex h-[600px]">
      <!-- Sidebar Tabs -->
      <div class="w-48 border-r border-gray-200 dark:border-gray-800 p-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors mb-1"
          :class="{
            'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300': activeTab === tab.id,
            'hover:bg-gray-100 dark:hover:bg-gray-800': activeTab !== tab.id,
            'opacity-50 cursor-not-allowed': tab.disabled
          }"
          :disabled="tab.disabled"
          @click="activeTab = tab.id"
        >
          <UIcon :name="tab.icon" class="w-4 h-4" />
          <span class="text-sm">{{ tab.label }}</span>
          <UBadge v-if="tab.disabled" size="xs" variant="soft">即將推出</UBadge>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 p-6 overflow-y-auto">
        
        <!-- General Tab -->
        <div v-if="activeTab === 'general'" class="space-y-6">
          <h3 class="text-lg font-medium">一般設置</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">名稱</label>
              <UInput
                v-model="form.name"
                placeholder="Table 名稱"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">描述</label>
              <UTextarea
                v-model="form.description"
                placeholder="Table 描述（可選）"
                :rows="3"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">圖標</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="icon in icons"
                  :key="icon.value"
                  class="w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-colors"
                  :class="form.icon === icon.value 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'"
                  @click="form.icon = icon.value"
                >
                  {{ icon.value }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">顏色</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="color in colors"
                  :key="color.value"
                  class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  :class="form.color === color.value ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'"
                  :style="{ backgroundColor: color.value }"
                  :title="color.label"
                  @click="form.color = color.value"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t">
            <UButton color="neutral" variant="ghost" @click="close">取消</UButton>
            <UButton color="primary" @click="saveGeneral">保存</UButton>
          </div>
        </div>

        <!-- Columns Tab -->
        <TableSettingsColumns
          v-else-if="activeTab === 'columns'"
          :item-id="itemId"
          :space-id="spaceId"
        />

        <!-- Filters Tab -->
        <TableSettingsFilters
          v-else-if="activeTab === 'filters'"
          :item-id="itemId"
          :space-id="spaceId"
        />

        <!-- Permissions Tab -->
        <TableSettingsPermissions
          v-else-if="activeTab === 'permissions'"
          :item-id="itemId"
          :space-id="spaceId"
        />

        <!-- Row Permissions Tab (Placeholder) -->
        <div v-else-if="activeTab === 'rowPermissions'" class="text-center py-12">
          <UIcon name="i-lucide-lock" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-500">Row 權限</h3>
          <p class="text-gray-400 mt-2">此功能即將推出</p>
        </div>
      </div>
    </div>
  </UModal>
</template>