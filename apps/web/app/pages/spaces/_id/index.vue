<script setup lang="ts">
import { useSpaces, useCurrentSpace } from "~/composables/useSpaces";

definePageMeta({
  middleware: ["auth"],
});

const route = useRoute();
const router = useRouter();
const spaceId = computed(() => route.params.id as string);

const { currentSpace, switchSpace, isLoading: isLoadingSpaces } = useSpaces();
const { items, isLoadingItems, loadItems } = useCurrentSpace();

// Ensure correct space is selected
onMounted(async () => {
  if (spaceId.value) {
    await switchSpace(spaceId.value);
    await loadItems();
  }
});

// Build item tree
const itemTree = computed(() => {
  const buildTree = (parentId: string | null = null): any[] => {
    return items.value
      .filter((item) => item.parent_id === parentId)
      .sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name))
      .map((item) => ({
        ...item,
        children: buildTree(item.id),
      }));
  };
  return buildTree();
});

// Get item icon based on type
function getItemIcon(item: any): string {
  if (item.icon) return item.icon;
  switch (item.type) {
    case "folder":
      return "i-lucide-folder";
    case "table":
      return "i-lucide-table";
    case "view":
      return "i-lucide-eye";
    case "dashboard":
      return "i-lucide-layout-dashboard";
    default:
      return "i-lucide-file";
  }
}

// Create item modal
const showCreateModal = ref(false);
const newItemType = ref<"folder" | "table" | "view" | "dashboard">("folder");
const newItemName = ref("");
const newItemParentId = ref<string | null>(null);
const isCreating = ref(false);
const toast = useToast();

async function createItem() {
  if (!newItemName.value || !spaceId.value) return;

  isCreating.value = true;
  try {
    await $fetch("/api/space-items", {
      method: "POST",
      body: {
        spaceId: spaceId.value,
        parentId: newItemParentId.value,
        type: newItemType.value,
        name: newItemName.value,
      },
    });

    toast.add({
      title: "Item created",
      description: `${newItemName.value} has been created`,
      color: "success",
    });

    // Refresh items
    await loadItems();

    // Reset and close
    newItemName.value = "";
    newItemParentId.value = null;
    showCreateModal.value = false;
  } catch (error: any) {
    toast.add({
      title: "Failed to create item",
      description: error.message || "Please try again",
      color: "error",
    });
  } finally {
    isCreating.value = false;
  }
}

// Navigate to item
function goToItem(item: any) {
  if (item.type === "folder") {
    // Toggle expand or navigate to folder view
    return;
  }
  // Navigate to item detail
  router.push(`/spaces/${spaceId.value}/items/${item.id}`);
}
</script>

<template>
  <div v-if="isLoadingSpaces || isLoadingItems" class="flex justify-center py-12">
    <ULoadingIcon size="lg" />
  </div>

  <div v-else-if="!currentSpace" class="p-6 text-center">
    <UIcon name="i-lucide-alert-circle" class="w-16 h-16 mx-auto mb-4 text-gray-400" />
    <h2 class="text-xl font-medium mb-2">Space not found</h2>
    <p class="text-gray-500">The space you're looking for doesn't exist or you don't have access.</p>
    <UButton to="/spaces" label="Back to Spaces" class="mt-4" />
  </div>

  <div v-else class="h-full flex">
    <!-- Sidebar with Items Tree -->
    <aside class="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <!-- Space Header -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded flex items-center justify-center"
            :style="{ backgroundColor: currentSpace.color || '#e5e7eb' }"
          >
            {{ currentSpace.icon || "📁" }}
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="font-medium truncate">{{ currentSpace.name }}</h2>
          </div>
        </div>
      </div>

      <!-- Items Tree -->
      <div class="flex-1 overflow-auto p-2">
        <div v-if="items.length === 0" class="text-center py-8 text-gray-500">
          <p class="text-sm">No items yet</p>
          <p class="text-xs mt-1">Create your first folder or table</p>
        </div>

        <!-- Recursive Tree Component -->
        <SpaceItemTree
          v-else
          :items="itemTree"
          @select="goToItem"
        />
      </div>

      <!-- Add Item Button -->
      <div class="p-2 border-t border-gray-200 dark:border-gray-800">
        <UDropdown
          :items="[
            [{ label: 'New Folder', icon: 'i-lucide-folder', click: () => { newItemType = 'folder'; showCreateModal = true; } }],
            [{ label: 'New Table', icon: 'i-lucide-table', click: () => { newItemType = 'table'; showCreateModal = true; } }],
            [{ label: 'New View', icon: 'i-lucide-eye', click: () => { newItemType = 'view'; showCreateModal = true; } }],
            [{ label: 'New Dashboard', icon: 'i-lucide-layout-dashboard', click: () => { newItemType = 'dashboard'; showCreateModal = true; } }],
          ]"
        >
          <UButton
            block
            icon="i-lucide-plus"
            label="Add Item"
          />
        </UDropdown>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 p-6">
      <!-- Empty State -->
      <div class="h-full flex flex-col items-center justify-center text-center">
        <UIcon name="i-lucide-mouse-pointer-2" class="w-16 h-16 mb-4 text-gray-300" />
        <h3 class="text-lg font-medium text-gray-600">Select an item</h3>
        <p class="text-gray-400 mt-1">Choose a folder, table, or view from the sidebar</p>
      </div>
    </main>

    <!-- Create Item Modal -->
    <UModal v-model="showCreateModal">
      <UCard class="w-full max-w-md">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium capitalize">New {{ newItemType }}</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="showCreateModal = false"
            />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="createItem">
          <UFormGroup label="Name" required>
            <UInput
              v-model="newItemName"
              :placeholder="`e.g., My ${newItemType}`"
              maxlength="255"
            />
          </UFormGroup>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancel"
              @click="showCreateModal = false"
            />
            <UButton
              color="primary"
              label="Create"
              :loading="isCreating"
              :disabled="!newItemName"
              @click="createItem"
            />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
