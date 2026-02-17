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
  switchSpace,
  isLoading: pending,
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

async function loadMembers() {
  try {
    members.value = await queryMembers(spaceId);
  } catch (error) {
    console.error('Failed to load members:', error);
  }
}

onMounted(async () => {
  const roleInfo = await getMySpaceRole(spaceId);
  myRole.value = roleInfo;
  await loadMembers();
});

// Get top members for avatar group (limit to 4)
const topMembers = computed(() => members.value.slice(0, 4));

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

// Sidebar collapsed state
const isSidebarCollapsed = ref(false);

// Handle tree item selection
function handleItemSelect(item: any) {
  // Navigate based on item type
  if (item.type === 'folder') {
    // Folders just expand/collapse, no navigation
    return;
  }

  // Navigate to item detail page
  navigateTo(`/spaces/${spaceId}/items/${item.id}`);
}
</script>

<template>
  <UDashboardPanel id="space" class="h-full" :ui="{body:'p-0 sm:p-0'}">
    <template #header>
      <UDashboardNavbar :title="space?.name || 'Space'">
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
              :to="`/spaces/${spaceId}/settings/members`"
            >
              {{ members.length }} members
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full">
        <!-- Sidebar with Item Tree -->
        <aside
          class="border-r border-default bg-default transition-all duration-300 overflow-hidden flex flex-col"
          :class="isSidebarCollapsed ? 'w-0 opacity-0' : 'w-72 opacity-100'"
        >
          <SpaceItemTree
            :space-id="spaceId"
            class="flex-1 overflow-auto"
            @select="handleItemSelect"
          />
        </aside>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <!-- Sidebar Toggle -->
          <div class="flex items-center justify-between px-4 py-2 border-b border-default">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              :icon="isSidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
              @click="isSidebarCollapsed = !isSidebarCollapsed"
            >
              {{ isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar' }}
            </UButton>

            <!-- Breadcrumb or page title could go here -->
            <UBreadcrumb
              v-if="route.meta?.breadcrumb"
              :items="route.meta.breadcrumb as any[]"
            />
          </div>

          <!-- Render child pages -->
          <div class="flex-1 overflow-auto">
            <NuxtPage />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Loading State -->
  <UContainer v-if="pending" class="py-6 max-w-3xl">
    <div class="space-y-6">
      <USkeleton class="h-40" />
      <USkeleton class="h-32" />
    </div>
  </UContainer>
</template>
