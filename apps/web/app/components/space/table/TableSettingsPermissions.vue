<script setup lang="ts">
const props = defineProps<{
  itemId: string
  spaceId: string
}>()

const toast = useToast()

// Load current permissions
const { data: permissions, refresh } = await useFetch(`/api/space-items/${props.itemId}/permissions`)

// Load space members for selection
const { data: spaceMembers } = await useFetch(`/api/spaces/${props.spaceId}/members`)

// Permission levels
const permissionLevels = [
  { value: 'read', label: '讀取', description: '只能查看，不能修改' },
  { value: 'readwrite', label: '讀寫', description: '可以查看和修改數據' },
  { value: 'manage', label: '管理', description: '可以修改結構和設置' }
]

// Add permission modal
const showAddModal = ref(false)
const newPermission = ref({
  userId: '',
  permission: 'read' as 'read' | 'readwrite' | 'manage'
})

const availableUsers = computed(() => {
  const existingUserIds = permissions.value?.map((p: any) => p.userId) || []
  return spaceMembers.value?.filter((m: any) => !existingUserIds.includes(m.userId)) || []
})

async function addPermission() {
  if (!newPermission.value.userId) return
  
  try {
    await $fetch(`/api/space-items/${props.itemId}/permissions`, {
      method: 'POST',
      body: newPermission.value
    })
    toast.add({
      title: 'Success',
      description: '權限已添加',
      color: 'success'
    })
    showAddModal.value = false
    newPermission.value = { userId: '', permission: 'read' }
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || '添加失敗',
      color: 'error'
    })
  }
}

async function updatePermission(userId: string, permission: string) {
  try {
    await $fetch(`/api/space-items/${props.itemId}/permissions/${userId}`, {
      method: 'PATCH',
      body: { permission }
    })
    toast.add({
      title: 'Success',
      description: '權限已更新',
      color: 'success'
    })
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || '更新失敗',
      color: 'error'
    })
  }
}

async function removePermission(userId: string, userName: string) {
  if (!confirm(`確定要移除 ${userName} 的權限嗎？`)) return
  
  try {
    await $fetch(`/api/space-items/${props.itemId}/permissions/${userId}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Success',
      description: '權限已移除',
      color: 'success'
    })
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || '移除失敗',
      color: 'error'
    })
  }
}

function getUserInfo(userId: string) {
  return spaceMembers.value?.find((m: any) => m.userId === userId)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-medium">權限設置</h3>
        <p class="text-sm text-gray-500 mt-1">
          設置誰可以訪問此 Table/View
        </p>
      </div>
      
      <UButton
        size="sm"
        color="primary"
        icon="i-lucide-plus"
        :disabled="!availableUsers?.length"
        @click="showAddModal = true"
      >
        添加權限
      </UButton>
    </div>

    <!-- Inherit from space notice -->
    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-info"
      title="繼承 Space 權限"
      description="如果沒有特別設置，用戶將繼承 Space 成員的權限。此處設置會覆蓋 Space 層級的權限。"
      class="mb-4"
    />

    <!-- Permissions List -->
    <div v-if="!permissions?.length" class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <UIcon name="i-lucide-shield" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p class="text-gray-500">暫無特別權限設置</p>
      <p class="text-sm text-gray-400 mt-1">所有用戶將繼承 Space 權限</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="permission in permissions"
        :key="permission.userId"
        class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
      >
        <!-- User Info -->
        <div class="flex items-center gap-3 flex-1">
          <UAvatar
            :src="getUserInfo(permission.userId)?.avatarUrl"
            :alt="getUserInfo(permission.userId)?.name"
            size="md"
          />
          <div>
            <div class="font-medium">{{ getUserInfo(permission.userId)?.name || 'Unknown' }}</div>
            <div class="text-sm text-gray-500">{{ getUserInfo(permission.userId)?.email }}</div>
          </div>
        </div>

        <!-- Permission Level -->
        <USelect
          :model-value="permission.permission"
          :options="permissionLevels.map(p => ({ 
            label: p.label, 
            value: p.value,
            description: p.description 
          }))"
          class="w-32"
          @update:model-value="updatePermission(permission.userId, $event)"
        />

        <!-- Remove -->
        <UButton
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          @click="removePermission(permission.userId, getUserInfo(permission.userId)?.name)"
        />
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h4 class="text-sm font-medium mb-3">權限說明</h4>
      <div class="space-y-2">
        <div v-for="level in permissionLevels" :key="level.value" class="flex items-start gap-2">
          <UBadge :color="level.value === 'read' ? 'blue' : level.value === 'readwrite' ? 'green' : 'purple'" size="xs">
            {{ level.label }}
          </UBadge>
          <span class="text-sm text-gray-600">{{ level.description }}</span>
        </div>
      </div>
    </div>

    <!-- Add Permission Modal -->
    <UModal v-model:open="showAddModal" title="添加權限">
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">選擇用戶</label>
            <USelect
              v-model="newPermission.userId"
              :options="availableUsers.map((u: any) => ({ 
                label: u.name, 
                value: u.userId,
                description: u.email 
              }))"
              placeholder="選擇用戶"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">權限級別</label>
            <URadioGroup
              v-model="newPermission.permission"
              :options="permissionLevels.map(p => ({
                label: p.label,
                value: p.value,
                description: p.description
              }))"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <UButton color="neutral" variant="ghost" @click="showAddModal = false">取消</UButton>
        <UButton 
          color="primary" 
          :disabled="!newPermission.userId"
          @click="addPermission"
        >
          添加
        </UButton>
      </template>
    </UModal>
  </div>
</template>