<script setup lang="ts">const props = defineProps<{
  itemId: string
  spaceId: string
}>()

const toast = useToast()

// Load item to get current config
const { data: item, refresh } = await useFetch(`/api/space-items/${props.itemId}`)

// Available columns for filter/sort (from source table if view)
const tableId = computed(() => {
  if (item.value?.type === 'view') {
    return item.value?.source_table_id
  }
  return props.itemId
})

const { data: columns } = await useFetch(() => `/api/space-items/${tableId.value}/columns`)

// Config
const config = computed(() => item.value?.config || {})
const filters = ref<any[]>([])
const sorts = ref<any[]>([])

watch(() => config.value, (newConfig) => {
  filters.value = newConfig.filters ? [...newConfig.filters] : []
  sorts.value = newConfig.sorts ? [...newConfig.sorts] : []
}, { immediate: true, deep: true })

// Filter operators
const operators: Record<string, string[]> = {
  text: ['equals', 'not_equals', 'contains', 'starts_with', 'ends_with', 'is_empty'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'is_empty'],
  select: ['equals', 'not_equals', 'is_any_of', 'is_empty'],
  date: ['equals', 'before', 'after', 'between', 'is_empty']
}

const operatorLabels: Record<string, string> = {
  equals: '等於',
  not_equals: '不等於',
  contains: '包含',
  starts_with: '開頭是',
  ends_with: '結尾是',
  is_empty: '為空',
  greater_than: '大於',
  less_than: '小於',
  between: '介於',
  is_any_of: '是其中之一',
  before: '之前',
  after: '之後'
}

// Add filter
function addFilter() {
  if (!columns.value?.length) return
  
  const firstCol = columns.value[0]
  filters.value.push({
    column: firstCol.key,
    operator: operators[firstCol.type]?.[0] || 'equals',
    value: ''
  })
}

// Remove filter
function removeFilter(index: number) {
  filters.value.splice(index, 1)
}

// Add sort
function addSort() {
  if (!columns.value?.length) return
  
  sorts.value.push({
    column: columns.value[0].key,
    direction: 'asc'
  })
}

// Remove sort
function removeSort(index: number) {
  sorts.value.splice(index, 1)
}

// Move sort up/down
function moveSort(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= sorts.value.length) return
  
  const temp = sorts.value[index]
  sorts.value[index] = sorts.value[newIndex]
  sorts.value[newIndex] = temp
}

// Get column type
function getColumnType(key: string) {
  return columns.value?.find((c: any) => c.key === key)?.type || 'text'
}

// Save config
async function saveConfig() {
  try {
    await $fetch(`/api/space-items/${props.itemId}`, {
      method: 'PATCH',
      body: {
        config: {
          ...config.value,
          filters: filters.value,
          sorts: sorts.value
        }
      }
    })
    toast.add({
      title: 'Success',
      description: '篩選與排序已保存',
      color: 'success'
    })
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || '保存失敗',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    
    <!-- Filters Section -->
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium">篩選條件</h3>
        <UButton
          size="sm"
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          :disabled="!columns?.length"
          @click="addFilter"
        >
          添加條件
        </UButton>
      </div>

      <div v-if="!filters.length" class="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <UIcon name="i-lucide-filter-x" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p class="text-gray-500">暫無篩選條件</p>
        <p class="text-xs text-gray-400 mt-1">添加條件來過濾顯示的數據</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="(filter, index) in filters"
          :key="index"
          class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <!-- Column Select -->
          <USelect
            v-model="filter.column"
            :options="columns?.map((c: any) => ({ label: c.name, value: c.key })) || []"
            class="w-40"
            size="sm"
          />

          <!-- Operator Select -->
          <USelect
            v-model="filter.operator"
            :options="(operators[getColumnType(filter.column)] || operators.text)
              .map((op: string) => ({ label: operatorLabels[op], value: op }))"
            class="w-32"
            size="sm"
          />

          <!-- Value Input -->
          <UInput
            v-if="!['is_empty'].includes(filter.operator)"
            v-model="filter.value"
            :type="getColumnType(filter.column) === 'number' ? 'number' : 'text'"
            placeholder="值"
            class="flex-1"
            size="sm"
          />

          <UButton
            size="xs"
            color="error"
            variant="ghost"
            icon="i-lucide-x"
            @click="removeFilter(index)"
          />
        </div>
      </div>
    </div>

    <UDivider />

    <!-- Sorts Section -->
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium">排序</h3>
        <UButton
          size="sm"
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          :disabled="!columns?.length"
          @click="addSort"
        >
          添加排序
        </UButton>
      </div>

      <div v-if="!sorts.length" class="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <UIcon name="i-lucide-arrow-up-down" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p class="text-gray-500">暫無排序</p>
        <p class="text-xs text-gray-400 mt-1">添加排序來組織數據顯示順序</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="(sort, index) in sorts"
          :key="index"
          class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <span class="text-sm text-gray-400 w-6">{{ index + 1 }}</span>

          <!-- Column Select -->
          <USelect
            v-model="sort.column"
            :options="columns?.map((c: any) => ({ label: c.name, value: c.key })) || []"
            class="w-40"
            size="sm"
          />

          <!-- Direction -->
          <UButtonGroup size="sm">
            <UButton
              :color="sort.direction === 'asc' ? 'primary' : 'neutral'"
              variant="soft"
              @click="sort.direction = 'asc'"
            >
              <UIcon name="i-lucide-arrow-up" class="w-4 h-4 mr-1" /
              升序
            </UButton>
            <UButton
              :color="sort.direction === 'desc' ? 'primary' : 'neutral'"
              variant="soft"
              @click="sort.direction = 'desc'"
            >
              <UIcon name="i-lucide-arrow-down" class="w-4 h-4 mr-1" /
              降序
            </UButton>
          </UButtonGroup>

          <!-- Move buttons -->
          <div class="flex-1 flex justify-end gap-1">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-arrow-up"
              :disabled="index === 0"
              @click="moveSort(index, -1)"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-arrow-down"
              :disabled="index === sorts.length - 1"
              @click="moveSort(index, 1)"
            />
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-x"
              @click="removeSort(index)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex justify-end pt-4 border-t">
      <UButton color="primary" @click="saveConfig">保存設置</UButton>
    </div>
  </div>
</template>