<script setup lang="ts">const route = useRoute()
const spaceId = route.params.id as string

// This is the default view when no item is selected
// The sidebar shows the tree, and this area can show a welcome message or recent items
</script>

<template>
  <UContainer class="py-8">
    <div class="max-w-2xl mx-auto text-center">
      <UIcon name="i-lucide-folder-tree" class="w-16 h-16 text-dimmed mb-4" />
      <h2 class="text-xl font-semibold mb-2">Select an Item</h2>
      <p class="text-dimmed">
        Choose an item from the sidebar to view or edit it.
      </p>
      <p class="text-sm text-dimmed mt-4">
        Or click the <UIcon name="i-lucide-plus" class="w-4 h-4 inline" /> button in the sidebar to create a new item.
      </p>
    </div>
  </UContainer>
</template>
