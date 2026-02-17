<script setup lang="ts">const route = useRoute();
const spaceId = route.params.id as string;

// Settings navigation items
const settingsNavItems = computed(() => [
  { label: "General", to: `/spaces/${spaceId}/settings` },
  { label: "Members", to: `/spaces/${spaceId}/settings/members` },
]);
</script>

<template>
  <div class="flex h-full">
    <!-- Settings Sidebar -->
    <aside class="w-48 border-r border-default py-4">
      <UNavigationMenu
        :items="settingsNavItems"
        orientation="vertical"
        variant="pill"
        class="px-2"
      />
    </aside>

    <!-- Settings Content -->
    <div class="flex-1 overflow-auto">
      <NuxtPage />
    </div>
  </div>
</template>
