<script setup lang="ts">
import draggable from 'vuedraggable'

const props = defineProps<{
  itemId: string
  spaceId: string
}>()

const toast = useToast()

// Load columns
const { data: columns, refresh } = await useFetch(`/api/space-items/${props.itemId}/columns`)

// Writable columns for drag
const columnsForDrag = ref<any[]>([])

watch(() => columns.value, (newCols) => {
  columnsForDrag.value = newCols ? [...newCols] : []
}, { immediate: true })

// Category colors
const categoryColors: Record<string, string> = {
  information: 'blue',
  relation: 'green', 
  dynamic: 'purple'
}

const categoryLabels: Record<string, string> = {
  information: '資料',
  relation: '關聯',
  dynamic: '動態'
}

// Drag end - update order
async function onDragEnd() {
  const updates = columnsForDrag.value.map((col, idx) => ({
    id: col.id,
    order_index: idx
  }))
  
  try {
    await $fetch(`/api/space-items/${props.itemId}/columns/reorder`, {
      method: 'POST',
      body: { updates }
    })
    toast.add({
      title: 'Success',
      description: '欄位順序已更新',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Error', 
      description: error.message || '更新失敗',
      color: 'error'
    })
  }
}

// Add dynamic column modal
const showAddModal = ref(false)
const newColumnForm = ref({
  name: '',
  type: 'formula' as 'formula' | 'rollup' | 'count',
  expression: ''
})

async function addDynamicColumn() {
  try {
    await $fetch(`/api/space-items/${props.itemId}/columns`, {
      method: 'POST',
      body: {
        name: newColumnForm.value.name,
        category: 'dynamic',
        type: newColumnForm.value.type,
        config: {
          expression: newColumnForm.value.expression,
          dependencies: []
        }
      }
    })
    toast.add({
      title: 'Success',
      description: '動態欄位已添加',
      color: 'success'
    })
    showAddModal.value = false
    newColumnForm.value = { name: '', type: 'formula', expression: '' }
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || '添加失敗',
      color: 'error'
    })
  }
}

// Delete column
async function deleteColumn(column: any) {
  if (!confirm(`確定要刪除欄位 "${column.name}" 嗎？`)) return
  
  try {
    await $fetch(`/api/space-items/${props.itemId}/columns/${column.id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Success',
      description: '欄位已刪除',
      color: 'success'
    })
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || '刪除失敗',
      color: 'error'
    })
  }
}

// Edit column (information columns only)
const editingColumn = ref<any>(null)
const editForm = ref({ name: '' })

function startEdit(column: any) {
  if (column.category !== 'information') {
    toast.add({
      title: 'Info',
      description: '只有資料欄位可以編輯名稱',
      color: 'info'
    })
    return
  }
  editingColumn.value = column
  editForm.value.name = column.name
}

async function saveEdit() {
  if (!editingColumn.value) return
  
  try {
    await $fetch(`/api/space-items/${props.itemId}/columns/${editingColumn.value.id}`, {
      method: 'PATCH',
      body: { name: editForm.value.name }
    })
    toast.add({
      title: 'Success',
      description: '欄位名稱已更新',
      color: 'success'
    })
    editingColumn.value = null
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || '更新失敗',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium">顯示欄位</h3>
      <UButton
        size="sm"
        color="primary"
        icon="i-lucide-plus"
        @click="showAddModal = true"
      >
        添加動態欄位
      </UButton>
    </div>

    <p class="text-sm text-gray-500">
      拖動欄位可調整順序。動態欄位（Formula/Rollup）可以在此添加。
    </p>

    <!-- Columns List -->
    <draggable
      v-model="columnsForDrag"
      item-key="id"
      handle=".drag-handle"
      ghost-class="ghost-column"
      @end="onDragEnd"
      class="space-y-2"
    >
      <template #item="{ element: column }">
        <div
          class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group"
          :class="{ 'opacity-50': column.deletedAt }"
        >
          <!-- Drag Handle -->
          <button class="drag-handle cursor-move text-gray-400 hover:text-gray-600">
            <UIcon name="i-lucide-grip-vertical" class="w-4 h-4" />
          </button>

          <!-- Column Info -->
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span v-if="editingColumn?.id === column.id">
                <UInput
                  v-model="editForm.name"
                  size="sm"
                  class="w-48"
                  @blur="saveEdit"
                  @keyup.enter="saveEdit"
                />
              </span>
              <span
                v-else
                class="font-medium cursor-pointer hover:text-primary-500"
                @click="startEdit(column)"
              >
                {{ column.name }}
              </span>
              
              <UBadge
                size="xs"
                :color="categoryColors[column.category]"
                variant="soft"
              >
                {{ categoryLabels[column.category] }}
              </UBadge>
              
              <UBadge
                v-if="column.type === 'formula'"
                size="xs"
                color="purple"
                variant="soft"
              >
                ƒ
              </UBadge>
            </div>
            <div class="text-xs text-gray-400 mt-0.5">
              {{ column.key }}
              <span v-if="column.config?.expression">• {{ column.config.expression }}</span>
            </div>
          </div>

          <!-- Type Icon -->
          <UIcon
            :name="column.type === 'text' ? 'i-lucide-type' 
              : column.type === 'number' ? 'i-lucide-hash'
              : column.type === 'select' ? 'i-lucide-list'
              : column.type === 'formula' ? 'i-lucide-function-square'
              : column.type === 'relation' ? 'i-lucide-link'
              : 'i-lucide-database'"
            class="w-4 h-4 text-gray-400"
          />

          <!-- Actions -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              v-if="column.category === 'dynamic'"
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              @click="deleteColumn(column)"
            />
          </div>
        </div>
      </template>
    </draggable>

    <!-- Add Dynamic Column Modal -->
    <UModal v-model:open="showAddModal" title="添加動態欄位">
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">名稱</label>
            <UInput
              v-model="newColumnForm.name"
              placeholder="例如: Total, Count, Discount"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">類型</label>
            <USelect
              v-model="newColumnForm.type"
              :options="[
                { label: 'Formula (公式)', value: 'formula' },
                { label: 'Rollup (聚合)', value: 'rollup' },
                { label: 'Count (計數)', value: 'count' }
              ]"
            />
          </div>

          <div v-if="newColumnForm.type === 'formula'">
            <label class="block text-sm font-medium mb-1">公式</label>
            <UTextarea
              v-model="newColumnForm.expression"
              placeholder="例如: {{quantity}} * {{price}} * 0.9"
              :rows="3"
            />
            <p class="text-xs text-gray-500 mt-1">
              使用 {{column_key}} 引用其他欄位
            </p>
          </div>

          <div v-else-if="newColumnForm.type === 'rollup'">
            <label class="block text-sm font-medium mb-1">聚合設置</label>
            <p class="text-sm text-gray-500">
              Rollup 配置將在下一步設置
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton color="neutral" variant="ghost" @click="showAddModal = false">取消</UButton>
        <UButton 
          color="primary" 
          :disabled="!newColumnForm.name"
          @click="addDynamicColumn"
        >
          添加
        </UButton>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.ghost-column {
  opacity: 0.5;
  background: #e0e7ff;
  border: 2px dashed #6366f1;
}
</style>