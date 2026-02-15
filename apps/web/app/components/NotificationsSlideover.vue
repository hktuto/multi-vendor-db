<script setup lang="ts">
const { isNotificationsSlideoverOpen } = useDashboard()

// TODO: Fetch notifications from API when notifications feature is implemented
const notifications = ref([])
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    title="Notifications"
  >
    <template #body>
      <div v-if="notifications.length === 0" class="text-center py-8 text-muted">
        <UIcon name="i-lucide-bell" class="size-12 mx-auto mb-4 opacity-50" />
        <p>No notifications yet</p>
      </div>
    </template>
  </USlideover>
</template>
