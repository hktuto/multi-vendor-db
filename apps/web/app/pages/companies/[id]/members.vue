<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { SyncedCompanyMember, SyncedInvite } from "~/composables/useCompanies";

definePageMeta({
    middleware: ["auth"],
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

const companyId = route.params.id as string;

// Use synced company data
const { currentCompany, allCompanies, switchCompany, isLoading: syncLoading, onMembersChange, onInvitesChange } = useCompanies();
const { role, isOwner, canManage } = useCurrentCompanyRole();
const { user: currentUser } = useCurrentUser();

// Local state for members and invites (queried on-demand)
const members = ref<SyncedCompanyMember[]>([]);
const invites = ref<SyncedInvite[]>([]);
const isLoadingMembers = ref(false);
const isLoadingInvites = ref(false);

// Switch to this company if not already current
onMounted(() => {
    if (currentCompany.value?.id !== companyId) {
        switchCompany(companyId);
    }
    loadMembers();
    loadInvites();

    // Register change callbacks
    const unsubMembers = onMembersChange(() => loadMembers());
    const unsubInvites = onInvitesChange(() => loadInvites());

    onUnmounted(() => {
        unsubMembers();
        unsubInvites();
    });
});

async function loadMembers() {
    isLoadingMembers.value = true;
    members.value = await useCompanies().queryMembers(companyId);
    isLoadingMembers.value = false;
}

async function loadInvites() {
    isLoadingInvites.value = true;
    invites.value = await useCompanies().queryInvites(companyId, 'pending');
    isLoadingInvites.value = false;
}

const invitesPending = computed(() => isLoadingInvites.value);

// Get company from synced data
const company = computed(() =>
    allCompanies.value.find(c => c.id === companyId) || null
);

// Watch for company not found
watch(
    () => company.value,
    (val) => {
        if (!syncLoading.value && allCompanies.value.length > 0 && !val) {
            toast.add({
                title: "Company not found",
                description: "The company you are looking for does not exist",
                color: "error",
            });
            router.push("/companies");
        }
    },
);

// Navigation items for secondary nav
const navItems = computed(() => [
    { label: "General", to: `/companies/${companyId}` },
    { label: "Members", to: `/companies/${companyId}/members` },
]);

// Fetch invites (not yet synced - using API)
const {
    data: invitesData,
    pending: invitesPending,
    refresh: refreshInvites,
} = await useFetch(`/api/companies/${companyId}/invites`);
const invites = computed(() => invitesData.value?.invites || []);

const { user: currentUser } = useCurrentUser();

const { user: currentUser } = useCurrentUser();

// Member table columns
const columns: TableColumn<any>[] = [
    {
        accessorKey: "user",
        header: "Member",
        cell: ({ row }) => {
            const member = row.original;
            const user = member.user;
            return h("div", { class: "flex items-center gap-3" }, [
                h(resolveComponent("UAvatar"), {
                    src: user?.avatarUrl,
                    alt: user?.name,
                    size: "sm",
                }),
                h("div", {}, [
                    h("div", { class: "font-medium" }, user?.name),
                    h("div", { class: "text-xs text-dimmed" }, user?.email),
                ]),
            ]);
        },
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
            const role = row.original.role;
            const roleColors: Record<string, string> = {
                owner: "text-amber-500",
                admin: "text-blue-500",
                member: "text-green-500",
            };
            return h(
                "span",
                {
                    class: `text-sm font-medium capitalize ${roleColors[role] || ""}`,
                },
                role,
            );
        },
    },
    {
        accessorKey: "joinedAt",
        header: "Joined",
        cell: ({ row }) =>
            h(
                "span",
                { class: "text-sm text-dimmed" },
                new Date(row.original.joinedAt).toLocaleDateString(),
            ),
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const member = row.original;
            const isSelf = member.userId === currentUser.value?.id;

            // Don't show actions for owner
            if (member.role === "owner") return null;

            const canEditMember =
                isOwner.value || (canManage.value && member.role !== "admin");

            if (!canEditMember && !isSelf) return null;

            return h("div", { class: "flex items-center justify-end gap-2" }, [
                isOwner.value &&
                    h(
                        resolveComponent("UDropdownMenu"),
                        {
                            items: [
                                [
                                    member.role === "member"
                                        ? {
                                              label: "Make Admin",
                                              icon: "i-lucide-shield",
                                              onSelect: () =>
                                                  updateRole(
                                                      member.userId,
                                                      "admin",
                                                  ),
                                          }
                                        : {
                                              label: "Make Member",
                                              icon: "i-lucide-user",
                                              onSelect: () =>
                                                  updateRole(
                                                      member.userId,
                                                      "member",
                                                  ),
                                          },
                                    {
                                        label: isSelf
                                            ? "Leave Company"
                                            : "Remove",
                                        icon: "i-lucide-user-minus",
                                        color: "error" as const,
                                        onSelect: () =>
                                            removeMember(member.userId, isSelf),
                                    },
                                ],
                            ],
                        },
                        () =>
                            h(resolveComponent("UButton"), {
                                color: "neutral",
                                variant: "ghost",
                                size: "sm",
                                icon: "i-lucide-more-vertical",
                            }),
                    ),

                !isOwner.value &&
                    isSelf &&
                    h(
                        resolveComponent("UButton"),
                        {
                            color: "error",
                            variant: "ghost",
                            size: "sm",
                            onClick: () => removeMember(member.userId, true),
                        },
                        () => "Leave",
                    ),
            ]);
        },
    },
];

// Add member modal
const addMemberModalOpen = ref(false);
const addMemberForm = reactive({
    email: "",
    role: "member" as "admin" | "member",
});
const isAddingMember = ref(false);
const addMemberErrors = reactive<Record<string, string>>({});

function validateAddMember(): boolean {
    addMemberErrors.email = "";

    if (!addMemberForm.email.trim()) {
        addMemberErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addMemberForm.email)) {
        addMemberErrors.email = "Invalid email address";
    }

    return !addMemberErrors.email;
}

async function addMember() {
    if (!validateAddMember()) return;

    isAddingMember.value = true;

    try {
        await $fetch(`/api/companies/${companyId}/members`, {
            method: "POST",
            body: {
                email: addMemberForm.email.trim(),
                role: addMemberForm.role,
            },
        });

        toast.add({
            title: "Member added",
            description: `${addMemberForm.email} has been added to the company`,
            color: "success",
        });

        addMemberForm.email = "";
        addMemberForm.role = "member";
        addMemberModalOpen.value = false;
        await refreshMembers();
    } catch (error: any) {
        toast.add({
            title: "Error",
            description: error.statusMessage || "Failed to add member",
            color: "error",
        });
    } finally {
        isAddingMember.value = false;
    }
}

// Update role
async function updateRole(userId: string, newRole: "admin" | "member") {
    try {
        await $fetch(`/api/companies/${companyId}/members/${userId}`, {
            method: "PATCH",
            body: { role: newRole },
        });

        toast.add({
            title: "Role updated",
            description: `Member role has been updated to ${newRole}`,
            color: "success",
        });

        await refreshMembers();
    } catch (error: any) {
        toast.add({
            title: "Error",
            description: error.statusMessage || "Failed to update role",
            color: "error",
        });
    }
}

// Remove member
const removeModalOpen = ref(false);
const memberToRemove = ref<{ userId: string; isSelf: boolean } | null>(null);
const isRemoving = ref(false);

function removeMember(userId: string, isSelf: boolean) {
    memberToRemove.value = { userId, isSelf };
    removeModalOpen.value = true;
}

async function confirmRemove() {
    if (!memberToRemove.value) return;

    isRemoving.value = true;

    try {
        await $fetch(
            `/api/companies/${companyId}/members/${memberToRemove.value.userId}`,
            {
                method: "DELETE",
            },
        );

        toast.add({
            title: memberToRemove.value.isSelf
                ? "Left company"
                : "Member removed",
            description: memberToRemove.value.isSelf
                ? "You have left the company"
                : "Member has been removed from the company",
            color: "success",
        });

        if (memberToRemove.value.isSelf) {
            router.push("/companies");
        } else {
            await refreshMembers();
        }
    } catch (error: any) {
        toast.add({
            title: "Error",
            description: error.statusMessage || "Failed to remove member",
            color: "error",
        });
    } finally {
        isRemoving.value = false;
        removeModalOpen.value = false;
        memberToRemove.value = null;
    }
}

// Invite management (owner only)
const createInviteModalOpen = ref(false);
const inviteForm = reactive({
    role: "member" as "admin" | "member",
    maxUses: null as number | null,
    expiresIn: "7" as string,
});
const isCreatingInvite = ref(false);
const createdInvite = ref<any>(null);

async function createInvite() {
    isCreatingInvite.value = true;

    try {
        const expiresAt = inviteForm.expiresIn
            ? new Date(
                  Date.now() +
                      parseInt(inviteForm.expiresIn) * 24 * 60 * 60 * 1000,
              ).toISOString()
            : undefined;

        const response = await $fetch(`/api/companies/${companyId}/invites`, {
            method: "POST",
            body: {
                role: inviteForm.role,
                maxUses: inviteForm.maxUses || undefined,
                expiresAt,
            },
        });

        createdInvite.value = response.invite;
        await refreshInvites();

        toast.add({
            title: "Invite created",
            description: "Invitation link has been generated",
            color: "success",
        });
    } catch (error: any) {
        toast.add({
            title: "Error",
            description: error.statusMessage || "Failed to create invite",
            color: "error",
        });
    } finally {
        isCreatingInvite.value = false;
    }
}

async function cancelInvite(token: string) {
    try {
        await $fetch(`/api/companies/${companyId}/invites/${token}`, {
            method: "DELETE",
        });

        toast.add({
            title: "Invite cancelled",
            description: "The invitation link has been cancelled",
            color: "success",
        });

        await refreshInvites();
    } catch (error: any) {
        toast.add({
            title: "Error",
            description: error.statusMessage || "Failed to cancel invite",
            color: "error",
        });
    }
}

function copyInviteLink(url: string) {
    navigator.clipboard.writeText(url);
    toast.add({
        title: "Copied!",
        description: "Invite link copied to clipboard",
        color: "success",
    });
}

function resetInviteForm() {
    inviteForm.role = "member";
    inviteForm.maxUses = null;
    inviteForm.expiresIn = "7";
    createdInvite.value = null;
}

function closeInviteModal() {
    createInviteModalOpen.value = false;
    // Reset form after modal closes
    nextTick(() => {
        resetInviteForm();
    });
}
</script>

<template>
    <UDashboardPanel id="company-members">
        <template #header>
            <UDashboardNavbar :title="company?.name || 'Company Members'">
                <template #leading>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-arrow-left"
                        to="/companies"
                    />
                </template>

                <template #right>
                    <UButton
                        v-if="canManage"
                        color="primary"
                        icon="i-lucide-user-plus"
                        @click="addMemberModalOpen = true"
                    >
                        Add Member
                    </UButton>
                </template>
            </UDashboardNavbar>

            <UDashboardToolbar>
                <template #left>
                    <div class="flex items-center gap-2">
                        <UBadge
                            v-if="company?.myRole"
                            variant="soft"
                            :color="
                                company.myRole === 'owner'
                                    ? 'warning'
                                    : 'primary'
                            "
                        >
                            {{ company.myRole }}
                        </UBadge>
                        <span class="text-sm text-dimmed"
                            >@{{ company?.slug }}</span
                        >
                    </div>
                </template>
            </UDashboardToolbar>

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
            <UContainer class="py-6 space-y-6">
                <!-- Members Section -->
                <UCard>
                    <template #header>
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-lg font-semibold">
                                    Company Members
                                </h2>
                                <p class="text-sm text-dimmed">
                                    {{ members.length }} member{{
                                        members.length !== 1 ? "s" : ""
                                    }}
                                </p>
                            </div>

                            <UButton
                                color="neutral"
                                variant="ghost"
                                icon="i-lucide-refresh-cw"
                                :loading="membersPending"
                                @click="refreshMembers()"
                            />
                        </div>
                    </template>

                    <UTable
                        :data="members"
                        :columns="columns"
                        :loading="membersPending"
                        class="w-full"
                    />
                </UCard>

                <!-- Invites Section (Owner Only) -->
                <UCard v-if="isOwner">
                    <template #header>
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-lg font-semibold">
                                    Invitation Links
                                </h2>
                                <p class="text-sm text-dimmed">
                                    {{ invites.length }} pending invite{{
                                        invites.length !== 1 ? "s" : ""
                                    }}
                                </p>
                            </div>

                            <div class="flex items-center gap-2">
                                <UButton
                                    color="neutral"
                                    variant="ghost"
                                    icon="i-lucide-refresh-cw"
                                    :loading="invitesPending"
                                    @click="refreshInvites()"
                                />
                                <UButton
                                    color="primary"
                                    variant="ghost"
                                    icon="i-lucide-link"
                                    @click="createInviteModalOpen = true"
                                >
                                    Create Link
                                </UButton>
                            </div>
                        </div>
                    </template>

                    <div
                        v-if="invites.length === 0"
                        class="text-center py-8 text-dimmed"
                    >
                        <UIcon name="i-lucide-link" class="text-4xl mb-2" />
                        <p>No pending invitation links</p>
                    </div>

                    <div v-else class="divide-y divide-default">
                        <div
                            v-for="invite in invites"
                            :key="invite.id"
                            class="flex items-center justify-between py-4"
                        >
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"
                                >
                                    <UIcon
                                        name="i-lucide-link"
                                        class="text-primary"
                                    />
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <UBadge
                                            size="sm"
                                            :color="
                                                invite.role === 'admin'
                                                    ? 'warning'
                                                    : 'primary'
                                            "
                                        >
                                            {{ invite.role }}
                                        </UBadge>
                                        <span
                                            v-if="invite.maxUses"
                                            class="text-xs text-dimmed"
                                        >
                                            {{ invite.usedCount }}/{{
                                                invite.maxUses
                                            }}
                                            uses
                                        </span>
                                    </div>
                                    <p class="text-xs text-dimmed mt-1">
                                        Created
                                        {{
                                            new Date(
                                                invite.createdAt,
                                            ).toLocaleDateString()
                                        }}
                                        <span v-if="invite.expiresAt">
                                            · Expires
                                            {{
                                                new Date(
                                                    invite.expiresAt,
                                                ).toLocaleDateString()
                                            }}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <UButton
                                    color="neutral"
                                    variant="ghost"
                                    size="sm"
                                    icon="i-lucide-copy"
                                    @click="copyInviteLink(invite.inviteUrl)"
                                />
                                <UButton
                                    color="error"
                                    variant="ghost"
                                    size="sm"
                                    icon="i-lucide-trash-2"
                                    @click="cancelInvite(invite.token)"
                                />
                            </div>
                        </div>
                    </div>
                </UCard>
            </UContainer>
        </template>
    </UDashboardPanel>

    <!-- Add Member Modal -->
    <UModal v-model:open="addMemberModalOpen" title="Add Member">
        <template #body>
            <form @submit.prevent="addMember" class="space-y-4">
                <UFormField
                    label="Email Address"
                    :error="addMemberErrors.email"
                    required
                >
                    <UInput
                        v-model="addMemberForm.email"
                        type="email"
                        placeholder="colleague@example.com"
                        class="w-full"
                    />
                </UFormField>

                <UFormField label="Role" required>
                    <URadioGroup
                        v-model="addMemberForm.role"
                        :items="[
                            {
                                label: 'Member - Can access company resources',
                                value: 'member',
                            },
                            {
                                label: 'Admin - Can manage members and settings',
                                value: 'admin',
                            },
                        ]"
                    />
                </UFormField>
            </form>
        </template>
        <template #footer>
            <UButton
                color="neutral"
                variant="ghost"
                @click="addMemberModalOpen = false"
            >
                Cancel
            </UButton>
            <UButton
                color="primary"
                :loading="isAddingMember"
                @click="addMember"
            >
                Add Member
            </UButton>
        </template>
    </UModal>

    <!-- Create Invite Modal -->
    <UModal
        v-model:open="createInviteModalOpen"
        title="Create Invitation Link"
        @update:open="
            (isOpen) => {
                if (!isOpen) resetInviteForm();
            }
        "
    >
        <template #body>
            <div v-if="createdInvite" class="space-y-4">
                <div class="text-center">
                    <div
                        class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
                    >
                        <UIcon
                            name="i-lucide-check"
                            class="text-3xl text-success"
                        />
                    </div>
                    <h3 class="font-semibold">Invitation Link Created!</h3>
                </div>

                <div class="space-y-2">
                    <label class="text-sm font-medium">Share this link:</label>
                    <div class="flex gap-2">
                        <UInput
                            :model-value="createdInvite.inviteUrl"
                            readonly
                            class="flex-1 font-mono text-sm"
                        />
                        <UButton
                            color="primary"
                            icon="i-lucide-copy"
                            @click="copyInviteLink(createdInvite.inviteUrl)"
                        />
                    </div>
                </div>
            </div>

            <form v-else @submit.prevent="createInvite" class="space-y-4">
                <UFormField label="Role" required>
                    <URadioGroup
                        v-model="inviteForm.role"
                        :items="[
                            { label: 'Member', value: 'member' },
                            { label: 'Admin', value: 'admin' },
                        ]"
                    />
                </UFormField>

                <UFormField label="Maximum Uses (optional)">
                    <UInput
                        v-model.number="inviteForm.maxUses"
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        class="w-full"
                    />
                </UFormField>

                <UFormField label="Expires In">
                    <USelect
                        v-model="inviteForm.expiresIn"
                        :items="[
                            { label: '7 days', value: '7' },
                            { label: '30 days', value: '30' },
                            { label: '90 days', value: '90' },
                            { label: 'Never', value: null },
                        ]"
                        class="w-full"
                    />
                </UFormField>
            </form>
        </template>
        <template #footer="{ close }">
            <template v-if="createdInvite">
                <UButton color="primary" @click="close">Done</UButton>
            </template>
            <template v-else>
                <UButton color="neutral" variant="ghost" @click="close"
                    >Cancel</UButton
                >
                <UButton
                    color="primary"
                    :loading="isCreatingInvite"
                    @click="createInvite"
                >
                    Create Link
                </UButton>
            </template>
        </template>
    </UModal>

    <!-- Remove Confirmation Modal -->
    <UModal
        v-model:open="removeModalOpen"
        :title="memberToRemove?.isSelf ? 'Leave Company' : 'Remove Member'"
    >
        <template #body>
            <p class="text-dimmed">
                <template v-if="memberToRemove?.isSelf">
                    Are you sure you want to leave
                    <strong>{{ company?.name }}</strong
                    >?
                </template>
                <template v-else>
                    Are you sure you want to remove this member from the
                    company?
                </template>
            </p>
        </template>
        <template #footer>
            <UButton
                color="neutral"
                variant="ghost"
                @click="removeModalOpen = false"
            >
                Cancel
            </UButton>
            <UButton
                :color="memberToRemove?.isSelf ? 'warning' : 'error'"
                :loading="isRemoving"
                @click="confirmRemove"
            >
                {{ memberToRemove?.isSelf ? "Leave Company" : "Remove Member" }}
            </UButton>
        </template>
    </UModal>
</template>
