<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const route = useRoute();
const spaceId = route.params.id as string;

// Use spaces composable
const { allSpaces, switchSpace, isLoading: pending, queryMembers } = useSpaces();

// Switch to this space
onMounted(() => {
  switchSpace(spaceId);
});

// Get space from synced data
const space = computed(
  () => allSpaces.value.find((s) => s.id === spaceId) || null
);

// Members
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

onMounted(() => {
  loadMembers();
});

// Recent activity (placeholder for now)
const recentActivity = ref([
  { id: 1, type: 'create', user: 'You', item: 'Welcome to the space', time: '2 hours ago' },
  { id: 2, type: 'update', user: 'You', item: 'Space settings', time: '1 day ago' },
]);
</script>

<template>
  <UContainer v-if="space" class="py-6">
    <div class="max-w-6xl space-y-6">
      <!-- Welcome Card -->
      <UCard>
        <div class="flex items-start gap-4">
          <div
            class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
            :style="{ backgroundColor: space.color || '#e5e7eb' }"
          >
            {{ space.icon || "🚀" }}
          </div>
          <div class="flex-1">
            <h1 class="text-2xl font-semibold">Welcome to {{ space.name }}</h1>
            <p v-if="space.description" class="text-dimmed mt-1">
              {{ space.description }}
            </p>
            <div class="flex items-center gap-4 mt-4 text-sm text-dimmed">
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-users" class="w-4 h-4" />
                {{ members.length }} members
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-calendar" class="w-4 h-4" />
                Created {{ new Date(space.created_at).toLocaleDateString() }}
              </span>
            </div>
          </div>
        </div>
      </UCard>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Quick Actions -->
        <UCard class="md:col-span-2">
          <template #header>
            <h3 class="font-semibold">Quick Actions</h3>
          </template>

          <div class="grid grid-cols-2 gap-4">
            <UButton
              color="primary"
              variant="soft"
              class="flex-col items-start h-auto py-4 px-4"
              :to="`/spaces/${spaceId}/items`"
            >
              <UIcon name="i-lucide-folder-open" class="w-6 h-6 mb-2" />
              <span class="font-medium">View Items</span>
              <span class="text-sm text-dimmed">Browse space items</span>
            </UButton>

            <UButton
              color="neutral"
              variant="soft"
              class="flex-col items-start h-auto py-4 px-4"
              :to="`/spaces/${spaceId}/settings`"
            >
              <UIcon name="i-lucide-settings" class="w-6 h-6 mb-2" />
              <span class="font-medium">Settings</span>
              <span class="text-sm text-dimmed">Manage space</span>
            </UButton>

            <UButton
              color="neutral"
              variant="soft"
              class="flex-col items-start h-auto py-4 px-4"
              :to="`/spaces/${spaceId}/settings/members`"
            >
              <UIcon name="i-lucide-users" class="w-6 h-6 mb-2" />
              <span class="font-medium">Members</span>
              <span class="text-sm text-dimmed">Manage members</span>
            </UButton>

            <UButton
              color="neutral"
              variant="soft"
              class="flex-col items-start h-auto py-4 px-4"
              to="/spaces"
            >
              <UIcon name="i-lucide-arrow-left" class="w-6 h-6 mb-2" />
              <span class="font-medium">All Spaces</span>
              <span class="text-sm text-dimmed">Back to list</span>
            </UButton>
          </div>
        </UCard>

        <!-- Members Preview -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Members</h3>
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                :to="`/spaces/${spaceId}/settings/members`"
              >
                View all
              </UButton>
            </div>
          </template>

          <div class="space-y-3">
            <div
              v-for="member in members.slice(0, 5)"
              :key="member.id"
              class="flex items-center gap-3"
            >
              <UAvatar
                :src="member.user?.avatar_url"
                :alt="member.user?.name"
                size="sm"
              />
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ member.user?.name || 'Unknown' }}</p>
                <p class="text-xs text-dimmed truncate">{{ member.role }}</p>
              </div>
            </div>

            <div v-if="members.length === 0" class="text-center py-4 text-dimmed">
              No members yet
            </div>

            <div v-if="members.length > 5" class="text-center text-sm text-dimmed pt-2">
              +{{ members.length - 5 }} more
            </div>
          </div>
        </UCard>
      </div>

      <!-- Recent Activity -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">Recent Activity</h3>
        </template>

        <div class="space-y-4">
          <div
            v-for="activity in recentActivity"
            :key="activity.id"
            class="flex items-center gap-3 py-2"
          >
            <UIcon
              :name="activity.type === 'create' ? 'i-lucide-plus-circle' : 'i-lucide-edit'"
              class="w-5 h-5 text-primary"
            />
            <div class="flex-1">
              <p class="text-sm">
                <span class="font-medium">{{ activity.user }}</span>
                {{ activity.type === 'create' ? 'created' : 'updated' }}
                <span class="font-medium">{{ activity.item }}</span>
              </p>
            </div>
            <span class="text-xs text-dimmed">{{ activity.time }}</span>
          </div>

          <div v-if="recentActivity.length === 0" class="text-center py-8 text-dimmed">
            No recent activity
          </div>
        </div>
      </UCard>
    </div>
  </UContainer>

  <!-- Loading State -->
  <UContainer v-if="pending" class="py-6">
    <div class="space-y-6">
      <USkeleton class="h-32" />
      <div class="grid grid-cols-3 gap-6">
        <USkeleton class="h-48 col-span-2" />
        <USkeleton class="h-48" />
      </div>
    </div>
  </UContainer>
</template>
