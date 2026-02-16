<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const route = useRoute();
const toast = useToast();

const spaceId = route.params.id as string;

// Use spaces composable
const { switchSpace, queryMembers, getMySpaceRole } = useSpaces();
const { currentUser } = useCurrentUser();

// Switch to this space
onMounted(() => {
  switchSpace(spaceId);
});

// Navigation items
const navItems = computed(() => [
  { label: "General", to: `/spaces/${spaceId}` },
  { label: "Members", to: `/spaces/${spaceId}/members` },
]);

// Members data
const members = ref<any[]>([]);
const isLoading = ref(false);

// Check user role
const myRole = ref<{ role: string | null; isAdmin: boolean; canManage: boolean; userId?: string }>({
  role: null,
  isAdmin: false,
  canManage: false,
});

const canInvite = computed(() => myRole.value.canManage);

// Load members
async function loadMembers() {
  isLoading.value = true;
  try {
    const [membersData, roleInfo] = await Promise.all([
      queryMembers(spaceId),
      getMySpaceRole(spaceId),
    ]);
    members.value = membersData;
    myRole.value = { 
      role: roleInfo.role, 
      isAdmin: roleInfo.isAdmin, 
      canManage: roleInfo.canManage,
    };
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadMembers();
});

// Get top members for avatar group
const topMembers = computed(() => members.value.slice(0, 4));

// Invite modal
const showInviteModal = ref(false);
const inviteEmail = ref("");
const inviteRole = ref<"admin" | "editor" | "viewer">("viewer");
const isInviting = ref(false);

async function sendInvite() {
  if (!inviteEmail.value) return;

  isInviting.value = true;
  try {
    await $fetch(`/api/spaces/${spaceId}/members`, {
      method: "POST",
      body: {
        email: inviteEmail.value,
        role: inviteRole.value,
      },
    });

    toast.add({
      title: "Member invited",
      description: `${inviteEmail.value} has been invited as ${inviteRole.value}`,
      color: "success",
    });

    inviteEmail.value = "";
    inviteRole.value = "viewer";
    showInviteModal.value = false;
    await loadMembers();
  } catch (error: any) {
    toast.add({
      title: "Failed to invite",
      description: error.message || "Please try again",
      color: "error",
    });
  } finally {
    isInviting.value = false;
  }
}

// Update role
const updatingMemberId = ref<string | null>(null);

async function updateRole(memberId: string, newRole: string) {
  updatingMemberId.value = memberId;
  try {
    await $fetch(`/api/space-members/${memberId}`, {
      method: "PATCH",
      body: { role: newRole },
    });

    toast.add({
      title: "Role updated",
      description: "Member role has been updated",
      color: "success",
    });

    await loadMembers();
  } catch (error: any) {
    toast.add({
      title: "Failed to update role",
      description: error.message || "Please try again",
      color: "error",
    });
  } finally {
    updatingMemberId.value = null;
  }
}

// Remove member
const removingMemberId = ref<string | null>(null);

async function removeMember(memberId: string) {
  removingMemberId.value = memberId;
  try {
    await $fetch(`/api/space-members/${memberId}`, {
      method: "DELETE",
    });

    toast.add({
      title: "Member removed",
      description: "Member has been removed from the space",
      color: "success",
    });

    await loadMembers();
  } catch (error: any) {
    toast.add({
      title: "Failed to remove",
      description: error.message || "Please try again",
      color: "error",
    });
  } finally {
    removingMemberId.value = null;
  }
}

// Role options
const roleOptions = [
  { value: "admin", label: "Admin", description: "Full access to manage space" },
  { value: "editor", label: "Editor", description: "Can create and edit items" },
  { value: "viewer", label: "Viewer", description: "Can only view items" },
];

// Role badge colors
const roleColors: Record<string, string> = {
  admin: "warning",
  editor: "primary",
  viewer: "neutral",
};

// Table columns
const columns = [
  {
    key: "user",
    label: "Member",
  },
  {
    key: "role",
    label: "Role",
  },
  {
    key: "joined",
    label: "Joined",
  },
  {
    key: "actions",
    label: "",
  },
];
</script>

<template>
  <UDashboardPanel id="space-members">
    <template #header>
      <UDashboardNavbar title="Space Members">
        <template #leading>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            :to="`/spaces/${spaceId}`"
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
            <span class="text-sm text-dimmed">{{ members.length }} members</span>
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
      <UContainer class="py-6">
        <div class="max-w-4xl">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">Members ({{ members.length }})</h3>
                <div class="flex items-center gap-2">
                  <UButton
                    v-if="canInvite"
                    color="primary"
                    size="sm"
                    icon="i-lucide-user-plus"
                    @click="showInviteModal = true"
                  >
                    Invite
                  </UButton>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-refresh-cw"
                    :loading="isLoading"
                    @click="loadMembers"
                  />
                </div>
              </div>
            </template>

            <UTable
              :rows="members"
              :columns="columns"
              :loading="isLoading"
            >
              <template #user-data="{ row }">
                <div class="flex items-center gap-3">
                  <UAvatar
                    :src="row.user?.avatar_url"
                    :alt="row.user?.name"
                    size="sm"
                  />
                  <div>
                    <p class="font-medium">{{ row.user?.name || "Unknown" }}</p>
                    <p class="text-sm text-dimmed">{{ row.user?.email }}</p>
                  </div>
                </div>
              </template>

              <template #role-data="{ row }">
                <UBadge
                  :color="roleColors[row.role] || 'neutral'"
                  variant="soft"
                >
                  {{ row.role }}
                </UBadge>
              </template>

              <template #joined-data="{ row }">
                <span class="text-sm text-dimmed">
                  {{ new Date(row.joined_at).toLocaleDateString() }}
                </span>
              </template>

              <template #actions-data="{ row }">
                <div class="flex items-center justify-end gap-2">
                  <!-- Edit role dropdown (admin only) -->
                  <UDropdown
                    v-if="canInvite && row.user_id !== myRole.userId"
                    :items="[
                      roleOptions.map((opt) => ({
                        label: `${opt.label} - ${opt.description}`,
                        onSelect: () => updateRole(row.id, opt.value),
                      })),
                      [
                        {
                          label: 'Remove from space',
                          color: 'error',
                          icon: 'i-lucide-user-minus',
                          onSelect: () => removeMember(row.id),
                        },
                      ],
                    ]"
                  >
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      icon="i-lucide-more-vertical"
                      :loading="updatingMemberId === row.id"
                    />
                  </UDropdown>
                </div>
              </template>
            </UTable>

            <!-- Empty State -->
            <div
              v-if="!isLoading && members.length === 0"
              class="text-center py-12"
            >
              <UIcon
                name="i-lucide-users"
                class="w-12 h-12 mx-auto mb-4 text-dimmed"
              />
              <p class="text-dimmed">No members yet</p>
              <p v-if="canInvite" class="text-sm text-dimmed mt-1">
                Invite members to collaborate in this space
              </p>
            </div>
          </UCard>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>

  <!-- Invite Modal -->
  <UModal v-model:open="showInviteModal" title="Invite Member">
    <template #body>
      <form class="space-y-4" @submit.prevent="sendInvite">
        <UFormField label="Email" required>
          <UInput
            v-model="inviteEmail"
            type="email"
            placeholder="member@example.com"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Role">
          <URadioGroup
            v-model="inviteRole"
            :items="roleOptions"
            orientation="vertical"
          >
            <template #label="{ item }">
              <div>
                <p class="font-medium">{{ item.label }}</p>
                <p class="text-sm text-dimmed">{{ item.description }}</p>
              </div>
            </template>
          </URadioGroup>
        </UFormField>
      </form>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="showInviteModal = false">
        Cancel
      </UButton>
      <UButton
        color="primary"
        :loading="isInviting"
        :disabled="!inviteEmail"
        @click="sendInvite"
      >
        Send Invite
      </UButton>
    </template>
  </UModal>
</template>
