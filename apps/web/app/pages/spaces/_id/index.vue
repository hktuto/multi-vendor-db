<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

const spaceId = route.params.id as string;

// Use spaces composable
const {
  allSpaces,
  currentSpace,
  currentSpaceId,
  switchSpace,
  isLoading: pending,
  updateSpace,
  archiveSpace,
  queryMembers,
} = useSpaces();

// Switch to this space if not current
onMounted(() => {
  switchSpace(spaceId);
});

// Get space from synced data
const space = computed(
  () => allSpaces.value.find((s) => s.id === spaceId) || null
);

// Check user role in this space
const { getMySpaceRole } = useSpaces();
const myRole = ref<{ role: string | null; isAdmin: boolean }>({ role: null, isAdmin: false });

// Space members for avatar group
const members = ref<any[]>([]);
const isLoadingMembers = ref(false);

async function loadMembers() {
  isLoadingMembers.value = true;
  try {
    members.value = await queryMembers(spaceId);
  } finally {
    isLoadingMembers.value = false;
  }
}

onMounted(async () => {
  const roleInfo = await getMySpaceRole(spaceId);
  myRole.value = roleInfo;
  await loadMembers();
});

// Get top members for avatar group (limit to 4)
const topMembers = computed(() => members.value.slice(0, 4));
const remainingCount = computed(() => Math.max(0, members.value.length - 4));

const canManage = computed(() => myRole.value.isAdmin);

// Watch for space not found
watch(
  () => space.value,
  (val) => {
    if (!pending.value && allSpaces.value.length > 0 && !val) {
      toast.add({
        title: "Space not found",
        description: "The space you are looking for does not exist",
        color: "error",
      });
      router.push("/spaces");
    }
  }
);

// Navigation items for secondary nav
const navItems = computed(() => [
  { label: "General", to: `/spaces/${spaceId}` },
  { label: "Members", to: `/spaces/${spaceId}/members` },
]);

// Edit form
const editForm = reactive({
  name: "",
  description: "",
  icon: "",
  color: "#3b82f6",
  settings: {} as Record<string, any>,
});

const isEditing = ref(false);
const isSaving = ref(false);
const editErrors = reactive<Record<string, string>>({});

watch(
  () => space.value,
  (val) => {
    if (val) {
      editForm.name = val.name;
      editForm.description = val.description || "";
      editForm.icon = val.icon || "";
      editForm.color = val.color || "#3b82f6";
      editForm.settings = val.settings || {};
    }
  },
  { immediate: true }
);

function validateEdit(): boolean {
  editErrors.name = "";

  if (!editForm.name.trim()) {
    editErrors.name = "Space name is required";
  } else if (editForm.name.length > 255) {
    editErrors.name = "Space name must be less than 255 characters";
  }

  return !editErrors.name;
}

async function saveChanges() {
  if (!validateEdit()) return;

  isSaving.value = true;

  try {
    await updateSpace(spaceId, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || undefined,
      icon: editForm.icon || undefined,
      color: editForm.color,
      settings: editForm.settings,
    });

    toast.add({
      title: "Settings saved",
      description: "Space settings have been updated",
      color: "success",
    });

    isEditing.value = false;
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to save changes",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
}

function cancelEdit() {
  if (space.value) {
    editForm.name = space.value.name;
    editForm.description = space.value.description || "";
    editForm.icon = space.value.icon || "";
    editForm.color = space.value.color || "#3b82f6";
    editForm.settings = space.value.settings || {};
  }
  isEditing.value = false;
  editErrors.name = "";
}

// Delete
const deleteModalOpen = ref(false);
const isDeleting = ref(false);

async function confirmDelete() {
  isDeleting.value = true;

  try {
    await archiveSpace(spaceId);

    toast.add({
      title: "Space archived",
      description: `${space.value?.name} has been archived`,
      color: "success",
    });

    router.push("/spaces");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to archive space",
      color: "error",
    });
  } finally {
    isDeleting.value = false;
    deleteModalOpen.value = false;
  }
}

// Color presets
const colorPresets = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#6366f1", // indigo
  "#14b8a6", // teal
];

// Icon options
const iconOptions = [
  { value: "", label: "Default (🚀)" },
  { value: "🚀", label: "🚀 Rocket" },
  { value: "📁", label: "📁 Folder" },
  { value: "⚙️", label: "⚙️ Gear" },
  { value: "📊", label: "📊 Chart" },
  { value: "📝", label: "📝 Note" },
  { value: "🎯", label: "🎯 Target" },
  { value: "🔬", label: "🔬 Lab" },
  { value: "🏭", label: "🏭 Factory" },
];
</script>

<template>
  <UDashboardPanel id="space-settings">
    <template #header>
      <UDashboardNavbar :title="space?.name || 'Space Settings'">
        <template #leading>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            to="/spaces"
          />
        </template>

        <template #right>
          <!-- Members Avatar Group -->
          <div class="flex items-center gap-2">
            <UAvatarGroup v-if="members.length > 0" :max="4" size="sm">
              <UAvatar
                v-for="member in topMembers"
                :key="member.id"
                :src="member.user?.avatar_url"
                :alt="member.user?.name"
                size="sm"
              />
            </UAvatarGroup>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-users"
              :to="`/spaces/${spaceId}/members`"
            >
              {{ members.length }} members
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>

      <!-- Secondary Navigation -->
      <UDashboardToolbar class="border-b border-default">
        <template #left>
          <UNavigationMenu
            :items="navItems"
            orientation="horizontal"
            variant="link"
            class="-mx-2"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UContainer v-if="space" class="py-6">
        <div class="max-w-3xl">
          <div class="flex items-center justify-between mb-6">
            <UButton
              v-if="canManage && !isEditing"
              color="primary"
              variant="ghost"
              icon="i-lucide-pencil"
              @click="isEditing = true"
            >
              Edit Settings
            </UButton>
          </div>

          <!-- View Mode -->
          <template v-if="!isEditing">
            <div class="space-y-6">
              <!-- Space Info Card -->
              <UCard>
                <template #header>
                  <h3 class="font-semibold">Space Information</h3>
                </template>

                <div class="space-y-4">
                  <div class="flex items-center gap-4">
                    <div
                      class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      :style="{ backgroundColor: space.color || '#e5e7eb' }"
                    >
                      {{ space.icon || "🚀" }}
                    </div>
                    <div>
                      <h2 class="text-xl font-semibold">{{ space.name }}</h2>
                      <p
                        v-if="space.description"
                        class="text-sm text-dimmed"
                      >
                        {{ space.description }}
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-4 pt-4 border-t border-default">
                    <div>
                      <label class="text-sm text-dimmed">Created</label>
                      <p>
                        {{ new Date(space.created_at).toLocaleDateString() }}
                      </p>
                    </div>
                    <div>
                      <label class="text-sm text-dimmed">Your Role</label>
                      <UBadge
                        v-if="myRole.role"
                        variant="soft"
                        :color="myRole.isAdmin ? 'warning' : 'primary'"
                      >
                        {{ myRole.role }}
                      </UBadge>
                      <span v-else class="text-dimmed">Unknown</span>
                    </div>
                  </div>
                </div>
              </UCard>

              <!-- Appearance Card -->
              <UCard>
                <template #header>
                  <h3 class="font-semibold">Appearance</h3>
                </template>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-sm text-dimmed">Icon</label>
                    <p class="text-2xl">{{ space.icon || "🚀" }}</p>
                  </div>
                  <div>
                    <label class="text-sm text-dimmed">Color</label>
                    <div
                      class="w-8 h-8 rounded-lg border border-default"
                      :style="{ backgroundColor: space.color || '#3b82f6' }"
                    />
                  </div>
                </div>
              </UCard>

              <!-- Settings Card -->
              <UCard v-if="Object.keys(space.settings || {}).length > 0">
                <template #header>
                  <h3 class="font-semibold">Settings</h3>
                </template>

                <pre class="text-sm text-dimmed">{{ JSON.stringify(space.settings, null, 2) }}</pre>
              </UCard>

              <!-- Danger Zone -->
              <UCard v-if="canManage" class="border-error">
                <template #header>
                  <div class="flex items-center gap-2 text-error">
                    <UIcon name="i-lucide-alert-triangle" />
                    <h3 class="font-semibold">Danger Zone</h3>
                  </div>
                </template>

                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">Archive this space</p>
                    <p class="text-sm text-dimmed">
                      This will hide the space from view. You can restore it later.
                    </p>
                  </div>
                  <UButton
                    color="error"
                    variant="outline"
                    @click="deleteModalOpen = true"
                  >
                    Archive Space
                  </UButton>
                </div>
              </UCard>
            </div>
          </template>

          <!-- Edit Mode -->
          <form v-else @submit.prevent="saveChanges" class="space-y-6">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold">Edit Space</h3>
                </div>
              </template>

              <div class="space-y-4">
                <UFormField label="Name" :error="editErrors.name" required>
                  <UInput v-model="editForm.name" class="w-full" />
                </UFormField>

                <UFormField label="Description">
                  <UTextarea
                    v-model="editForm.description"
                    :rows="3"
                    class="w-full"
                  />
                </UFormField>

                <div class="grid grid-cols-2 gap-4">
                  <UFormField label="Icon">
                    <USelect
                      v-model="editForm.icon"
                      :items="iconOptions"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Color">
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="color in colorPresets"
                        :key="color"
                        type="button"
                        class="w-8 h-8 rounded-lg border-2 transition-all"
                        :class="editForm.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
                        :style="{ backgroundColor: color }"
                        @click="editForm.color = color"
                      />
                      <input
                        v-model="editForm.color"
                        type="color"
                        class="w-8 h-8 rounded-lg cursor-pointer"
                      />
                    </div>
                  </UFormField>
                </div>
              </div>
            </UCard>

            <div class="flex items-center gap-4">
              <UButton type="submit" color="primary" :loading="isSaving">
                Save Changes
              </UButton>
              <UButton color="neutral" variant="ghost" @click="cancelEdit">
                Cancel
              </UButton>
            </div>
          </form>
        </div>
      </UContainer>

      <!-- Loading State -->
      <UContainer v-if="pending" class="py-6 max-w-3xl">
        <div class="space-y-6">
          <USkeleton class="h-40" />
          <USkeleton class="h-32" />
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>

  <!-- Archive Confirmation Modal -->
  <UModal v-model:open="deleteModalOpen" title="Archive Space">
    <template #body>
      <p class="text-dimmed">
        Are you sure you want to archive
        <strong>{{ space?.name }}</strong
        >? You can restore it later from the space list.
      </p>
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">
        Cancel
      </UButton>
      <UButton color="error" :loading="isDeleting" @click="confirmDelete">
        Archive Space
      </UButton>
    </template>
  </UModal>
</template>
