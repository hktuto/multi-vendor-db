<script setup lang="ts">
import { useSpaces, type SyncedSpace } from "~/composables/useSpaces";
import { useCompanies } from "~/composables/useCompanies";

definePageMeta({
  middleware: ["auth"],
});

const { allSpaces, currentSpaceId, isLoading, switchSpace } = useSpaces();
const { allCompanies } = useCompanies();
const toast = useToast();

// Group spaces by company
const spacesByCompany = computed(() => {
  const grouped = new Map<string, SyncedSpace[]>();

  for (const space of allSpaces.value) {
    const companySpaces = grouped.get(space.company_id) || [];
    companySpaces.push(space);
    grouped.set(space.company_id, companySpaces);
  }

  return grouped;
});

// Get company name by ID
function getCompanyName(companyId: string): string {
  return allCompanies.value.find((c) => c.id === companyId)?.name || "Unknown Company";
}

// Navigate to space
async function goToSpace(spaceId: string) {
  await switchSpace(spaceId);
  await navigateTo(`/spaces/${spaceId}`);
}

// Create space modal
const showCreateModal = ref(false);
const selectedCompanyId = ref("");
const newSpaceName = ref("");
const newSpaceDescription = ref("");
const isCreating = ref(false);

async function createSpace() {
  if (!newSpaceName.value || !selectedCompanyId.value) return;

  isCreating.value = true;
  try {
    await $fetch("/api/spaces", {
      method: "POST",
      body: {
        companyId: selectedCompanyId.value,
        name: newSpaceName.value,
        description: newSpaceDescription.value || undefined,
      },
    });

    toast.add({
      title: "Space created",
      description: `${newSpaceName.value} has been created`,
      color: "success",
    });

    // Reset and close
    newSpaceName.value = "";
    newSpaceDescription.value = "";
    showCreateModal.value = false;
  } catch (error: any) {
    toast.add({
      title: "Failed to create space",
      description: error.message || "Please try again",
      color: "error",
    });
  } finally {
    isCreating.value = false;
  }
}

// Initialize selected company
onMounted(() => {
  if (allCompanies.value.length > 0 && !selectedCompanyId.value) {
    selectedCompanyId.value = allCompanies.value[0]?.id ?? "";
  }
});
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold">Spaces</h1>
        <p class="text-gray-500 dark:text-gray-400">
          Manage your workspaces across all companies
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        label="Create Space"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <ULoadingIcon size="lg" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="allSpaces.length === 0"
      class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      <UIcon name="i-lucide-layout-grid" class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h3 class="text-lg font-medium mb-2">No spaces yet</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6">
        Create your first space to start organizing your work
      </p>
      <UButton
        icon="i-lucide-plus"
        label="Create Space"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Spaces by Company -->
    <div v-else class="space-y-8">
      <div
        v-for="[companyId, spaces] in spacesByCompany"
        :key="companyId"
      >
        <!-- Company Header -->
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <UIcon name="i-lucide-building-2" class="w-4 h-4 text-primary-600" />
          </div>
          <h2 class="text-lg font-semibold">{{ getCompanyName(companyId) }}</h2>
        </div>

        <!-- Spaces Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UCard
            v-for="space in spaces"
            :key="space.id"
            class="cursor-pointer hover:shadow-md transition-shadow"
            :class="{ 'ring-2 ring-primary-500': currentSpaceId === space.id }"
            @click="goToSpace(space.id)"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                :style="{ backgroundColor: space.color || '#e5e7eb' }"
              >
                {{ space.icon || "📁" }}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium truncate">{{ space.name }}</h3>
                <p
                  v-if="space.description"
                  class="text-sm text-gray-500 dark:text-gray-400 truncate"
                >
                  {{ space.description }}
                </p>
                <p class="text-xs text-gray-400 mt-1">
                  Created {{ new Date(space.created_at).toLocaleDateString() }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <!-- Create Space Modal -->
    <UModal v-model="showCreateModal">
      <UCard class="w-full max-w-md">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium">Create New Space</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="showCreateModal = false"
            />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="createSpace">
          <UFormGroup label="Company" required>
            <USelectMenu
              v-model="selectedCompanyId"
              :options="allCompanies"
              option-attribute="name"
              value-attribute="id"
              placeholder="Select a company"
            />
          </UFormGroup>

          <UFormGroup label="Name" required>
            <UInput
              v-model="newSpaceName"
              placeholder="e.g., Marketing Team"
              maxlength="255"
            />
          </UFormGroup>

          <UFormGroup label="Description">
            <UTextarea
              v-model="newSpaceDescription"
              placeholder="What is this space for?"
              :rows="3"
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
              :disabled="!newSpaceName || !selectedCompanyId"
              @click="createSpace"
            />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
