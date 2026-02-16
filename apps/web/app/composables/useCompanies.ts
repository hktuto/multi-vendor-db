import { createSharedComposable } from "@vueuse/core";
import { useElectricSync, type SyncEventCallbacks } from "./useElectricSync";
import { usePgWorker } from "./usePgWorker";
import { useCurrentUser } from "./useTableSync";

/**
 * Company data structure
 */
export interface SyncedCompany {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: 'basic' | 'pro' | 'enterprise' | string;  // SaaS plan control
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Company member data structure
 */
export interface SyncedCompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  invited_by: string | null;
}

/**
 * Invite data structure - one invite per person
 */
export interface SyncedInvite {
  id: string;
  company_id: string;
  email: string;        // Unique per company - one invite per person
  invited_by: string;   // User ID who sent the invite
  role: 'admin' | 'member';
  token: string;        // Unique token for accept link
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  accepted_by: string | null;  // User ID who accepted (for tracking)
}

/**
 * Companies sync composable with current company management
 *
 * This composable:
 * - Syncs all companies the user has access to (from server-side filtered shape)
 * - Syncs company_members for all companies
 * - Tracks current selected company in global state
 * - Provides switchCompany() to change current company
 * - Auto syncs on mount, auto cleanup on unmount
 *
 * Usage:
 * ```ts
 * // In layout or app.vue - init companies sync
 * const { currentCompany, allCompanies, members, switchCompany, isLoading } = useCompanies()
 *
 * // Access current company data (reactive)
 * console.log(currentCompany.value?.name)
 *
 * // Access all companies
 * console.log(allCompanies.value)
 *
 * // Access current company members
 * console.log(members.value)
 *
 * // Switch company
 * await switchCompany(companyId)
 *
 * // Check if user can manage current company
 * const canManage = computed(() => {
 *   const myMember = members.value.find(m => m.user_id === currentUserId)
 *   return myMember?.role === 'owner' || myMember?.role === 'admin'
 * })
 * ```
 */
const _useCompanies = () => {
  const electric = useElectricSync();
  const pg = usePgWorker();

  // Global state - current selected company
  const currentCompanyId = useState<string | null>(
    "companies-current-id",
    () => null
  );

  // Data - only companies are global state
  const allCompanies = useState<SyncedCompany[]>("companies-all", () => []);
  // Members and invites are queried on-demand, not stored in global state
  // But we track if sync is active for these tables
  const membersSyncActive = useState("companies-members-sync", () => false);
  const invitesSyncActive = useState("companies-invites-sync", () => false);

  // Status
  const isLoading = useState("companies-loading", () => false);
  const isUpToDate = useState("companies-uptodate", () => false);
  const error = useState<Error | null>("companies-error", () => null);

  // Unsubscribe functions
  let unsubscribeCompanies: (() => void) | null = null;
  let unsubscribeMembers: (() => void) | null = null;
  let unsubscribeInvites: (() => void) | null = null;

  // Change callbacks (pages can register to receive change notifications)
  const membersChangeCallbacks = new Set<() => void>();
  const invitesChangeCallbacks = new Set<() => void>();

  // Computed
  const currentCompany = computed(() => {
    if (!currentCompanyId.value) return null;
    return (
      allCompanies.value.find((c) => c.id === currentCompanyId.value) || null
    );
  });

  /**
   * Register a callback for members changes
   */
  function onMembersChange(callback: () => void): () => void {
    membersChangeCallbacks.add(callback);
    return () => membersChangeCallbacks.delete(callback);
  }

  /**
   * Register a callback for invites changes
   */
  function onInvitesChange(callback: () => void): () => void {
    invitesChangeCallbacks.add(callback);
    return () => invitesChangeCallbacks.delete(callback);
  }

  /**
   * Notify all registered callbacks
   */
  function notifyMembersChange() {
    membersChangeCallbacks.forEach((cb) => cb());
  }

  function notifyInvitesChange() {
    invitesChangeCallbacks.forEach((cb) => cb());
  }

  /**
   * Query members for a specific company (on-demand)
   */
  async function queryMembers(companyId?: string): Promise<SyncedCompanyMember[]> {
    const cid = companyId || currentCompanyId.value;
    if (!cid) return [];

    const worker = await pg.init();
    const result = await worker.query<SyncedCompanyMember>(
      "SELECT * FROM company_members WHERE company_id = $1 ORDER BY joined_at DESC",
      [cid]
    );
    return result.rows;
  }

  /**
   * Query invites for a specific company (on-demand)
   */
  async function queryInvites(
    companyId?: string,
    status?: "pending" | "accepted" | "expired" | "cancelled"
  ): Promise<SyncedInvite[]> {
    const cid = companyId || currentCompanyId.value;
    if (!cid) return [];

    const worker = await pg.init();
    let sql = "SELECT * FROM invites WHERE company_id = $1";
    const params: any[] = [cid];

    if (status) {
      sql += " AND status = $2";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";

    const result = await worker.query<SyncedInvite>(sql, params);
    return result.rows;
  }

  /**
   * Switch to a different company
   */
  async function switchCompany(companyId: string | null) {
    if (companyId && !allCompanies.value.find((c) => c.id === companyId)) {
      console.warn("[useCompanies] Company not found:", companyId);
      return;
    }
    currentCompanyId.value = companyId;
    console.log("[useCompanies] Switched to company:", companyId);
  }

  /**
   * Refresh companies data from local DB (global state)
   */
  async function refreshCompanies(): Promise<SyncedCompany[]> {
    const worker = await pg.init();
    const result = await worker.query<SyncedCompany>(
      "SELECT * FROM companies WHERE deleted_at IS NULL ORDER BY name"
    );
    allCompanies.value = result.rows;
    return result.rows;
  }

  /**
   * Check if user has specific role in company
   */
  async function checkRole(
    userId: string,
    companyId?: string,
    requiredRole?: "owner" | "admin" | "member"
  ): Promise<{ role: string | null; isOwner: boolean; isAdmin: boolean; canManage: boolean }> {
    const cid = companyId || currentCompanyId.value;
    if (!cid || !userId) {
      return { role: null, isOwner: false, isAdmin: false, canManage: false };
    }

    const worker = await pg.init();
    const result = await worker.query<{ role: string }>(
      "SELECT role FROM company_members WHERE company_id = $1 AND user_id = $2",
      [cid, userId]
    );

    if (result.rows.length === 0) {
      return { role: null, isOwner: false, isAdmin: false, canManage: false };
    }

    const role = result.rows[0].role;
    const isOwner = role === "owner";
    const isAdmin = role === "admin" || role === "owner";
    const canManage = isAdmin;

    return { role, isOwner, isAdmin, canManage };
  }

  /**
   * Start syncing companies (always sync)
   * Optionally sync members and invites with callbacks only (no state)
   */
  async function startSync(options?: {
    syncMembers?: boolean;
    syncInvites?: boolean;
  }): Promise<void> {
    if (isLoading.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Load initial companies data
      await refreshCompanies();

      // Set first company as current if none selected
      if (!currentCompanyId.value && allCompanies.value.length > 0) {
        currentCompanyId.value = allCompanies.value[0].id;
      }

      // Subscribe to companies table (global state)
      unsubscribeCompanies = await electric.subscribe<SyncedCompany>({
        table: "companies",
        callbacks: {
          onInsert: async (company) => {
            await refreshCompanies();
            if (!currentCompanyId.value) {
              currentCompanyId.value = company.id;
            }
          },
          onUpdate: async () => {
            await refreshCompanies();
          },
          onDelete: async () => {
            await refreshCompanies();
            if (
              currentCompanyId.value &&
              !allCompanies.value.find((c) => c.id === currentCompanyId.value)
            ) {
              currentCompanyId.value = allCompanies.value[0]?.id || null;
            }
          },
          onUpToDate: () => {
            isUpToDate.value = true;
            isLoading.value = false;
          },
          onError: (err) => {
            error.value = err;
            isLoading.value = false;
          },
        },
      });

      // Optionally sync members (no state, just callbacks)
      if (options?.syncMembers !== false) {
        membersSyncActive.value = true;
        unsubscribeMembers = await electric.subscribe<SyncedCompanyMember>({
          table: "company_members",
          callbacks: {
            onInsert: notifyMembersChange,
            onUpdate: notifyMembersChange,
            onDelete: notifyMembersChange,
          },
        });
      }

      // Optionally sync invites (no state, just callbacks)
      if (options?.syncInvites !== false) {
        invitesSyncActive.value = true;
        unsubscribeInvites = await electric.subscribe<SyncedInvite>({
          table: "invites",
          callbacks: {
            onInsert: notifyInvitesChange,
            onUpdate: notifyInvitesChange,
            onDelete: notifyInvitesChange,
          },
        });
      }
    } catch (err) {
      error.value = err as Error;
      isLoading.value = false;
    }
  }

  /**
   * Stop syncing
   */
  function stopSync() {
    unsubscribeCompanies?.();
    unsubscribeMembers?.();
    unsubscribeInvites?.();
    unsubscribeCompanies = null;
    unsubscribeMembers = null;
    unsubscribeInvites = null;
    membersSyncActive.value = false;
    invitesSyncActive.value = false;
    isLoading.value = false;
    isUpToDate.value = false;
    // Clear callbacks
    membersChangeCallbacks.clear();
    invitesChangeCallbacks.clear();
  }

  // Auto start sync on mount (only if in client)
  onMounted(() => {
    startSync();
  });

  // Cleanup on unmount
  onUnmounted(() => {
    stopSync();
  });

  return {
    // State (readonly)
    currentCompanyId: readonly(currentCompanyId),
    currentCompany: readonly(currentCompany),
    allCompanies: readonly(allCompanies),
    isLoading: readonly(isLoading),
    isUpToDate: readonly(isUpToDate),
    error: readonly(error),
    membersSyncActive: readonly(membersSyncActive),
    invitesSyncActive: readonly(invitesSyncActive),

    // Actions
    switchCompany,
    refreshCompanies,
    queryMembers,
    queryInvites,
    checkRole,
    startSync,
    stopSync,

    // Change callbacks (pages register to receive notifications)
    onMembersChange,
    onInvitesChange,
  };
};

export const useCompanies = createSharedComposable(_useCompanies);

/**
 * Helper composable to get current user's role in current company
 * Queries membership on-demand instead of storing in global state
 */
export function useCurrentCompanyRole() {
  const companies = useCompanies();
  const { user } = useCurrentUser();

  const role = ref<string | null>(null);
  const isOwner = computed(() => role.value === "owner");
  const isAdmin = computed(() => role.value === "admin" || role.value === "owner");
  const isMember = computed(() => !!role.value);
  const canManage = isAdmin;

  // Query role when company or user changes
  watch(
    [() => companies.currentCompanyId.value, () => user.value?.id],
    async ([companyId, userId]) => {
      if (!companyId || !userId) {
        role.value = null;
        return;
      }
      const result = await companies.checkRole(userId, companyId);
      role.value = result.role;
    },
    { immediate: true }
  );

  // Listen for members changes to update role
  onMounted(() => {
    const unsubscribe = companies.onMembersChange(async () => {
      if (companies.currentCompanyId.value && user.value?.id) {
        const result = await companies.checkRole(
          user.value.id,
          companies.currentCompanyId.value
        );
        role.value = result.role;
      }
    });

    onUnmounted(unsubscribe);
  });

  return {
    role: readonly(role),
    isOwner,
    isAdmin,
    isMember,
    canManage,
  };
}

/**
 * Helper composable for company-specific data operations
 * Provides reactive queries scoped to current company
 */
export function useCompanyQueries(companyId?: string) {
  const companies = useCompanies();
  const pg = usePgWorker();

  const targetCompanyId = computed(() => companyId || companies.currentCompanyId.value);

  // Local state for queries
  const members = ref<SyncedCompanyMember[]>([]);
  const invites = ref<SyncedInvite[]>([]);
  const isLoadingMembers = ref(false);
  const isLoadingInvites = ref(false);

  /**
   * Load members for current company
   */
  async function loadMembers() {
    if (!targetCompanyId.value) return;
    isLoadingMembers.value = true;
    members.value = await companies.queryMembers(targetCompanyId.value);
    isLoadingMembers.value = false;
  }

  /**
   * Load invites for current company
   */
  async function loadInvites(status?: 'pending' | 'accepted' | 'expired' | 'cancelled') {
    if (!targetCompanyId.value) return;
    isLoadingInvites.value = true;
    invites.value = await companies.queryInvites(targetCompanyId.value, status);
    isLoadingInvites.value = false;
  }

  // Auto-load when company changes
  watch(targetCompanyId, () => {
    loadMembers();
    loadInvites('pending');
  }, { immediate: true });

  // Listen for changes and reload
  onMounted(() => {
    const unsubMembers = companies.onMembersChange(() => {
      loadMembers();
    });
    const unsubInvites = companies.onInvitesChange(() => {
      loadInvites('pending');
    });

    onUnmounted(() => {
      unsubMembers();
      unsubInvites();
    });
  });

  return {
    companyId: targetCompanyId,
    members: readonly(members),
    invites: readonly(invites),
    isLoadingMembers: readonly(isLoadingMembers),
    isLoadingInvites: readonly(isLoadingInvites),
    loadMembers,
    loadInvites,
  };
}
