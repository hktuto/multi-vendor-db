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

  // Data
  const allCompanies = useState<SyncedCompany[]>("companies-all", () => []);
  const allMembers = useState<SyncedCompanyMember[]>("companies-members", () => []);
  const allInvites = useState<SyncedInvite[]>("companies-invites", () => []);

  // Status
  const isLoading = useState("companies-loading", () => false);
  const isUpToDate = useState("companies-uptodate", () => false);
  const error = useState<Error | null>("companies-error", () => null);

  // Unsubscribe functions
  let unsubscribeCompanies: (() => void) | null = null;
  let unsubscribeMembers: (() => void) | null = null;
  let unsubscribeInvites: (() => void) | null = null;

  // Computed
  const currentCompany = computed(() => {
    if (!currentCompanyId.value) return null;
    return (
      allCompanies.value.find((c) => c.id === currentCompanyId.value) || null
    );
  });

  const members = computed(() => {
    if (!currentCompanyId.value) return [];
    return allMembers.value.filter(
      (m) => m.company_id === currentCompanyId.value
    );
  });

  // Invites for current company
  const invites = computed(() => {
    if (!currentCompanyId.value) return [];
    return allInvites.value.filter(
      (i) => i.company_id === currentCompanyId.value && i.status === 'pending'
    );
  });

  const myRole = computed(() => {
    // This requires current user ID - will be injected from useCurrentUser
    return null;
  });

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
   * Refresh companies data from local DB
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
   * Refresh members data from local DB
   */
  async function refreshMembers(): Promise<SyncedCompanyMember[]> {
    const worker = await pg.init();
    const result = await worker.query<SyncedCompanyMember>(
      "SELECT * FROM company_members ORDER BY joined_at DESC"
    );
    allMembers.value = result.rows;
    return result.rows;
  }

  /**
   * Refresh invites data from local DB
   */
  async function refreshInvites(): Promise<SyncedInvite[]> {
    const worker = await pg.init();
    const result = await worker.query<SyncedInvite>(
      "SELECT * FROM invites ORDER BY created_at DESC"
    );
    allInvites.value = result.rows;
    return result.rows;
  }

  /**
   * Start syncing companies, members and invites
   */
  async function startSync() {
    if (isLoading.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Load initial data
      await refreshCompanies();
      await refreshMembers();
      await refreshInvites();

      // Set first company as current if none selected
      if (!currentCompanyId.value && allCompanies.value.length > 0) {
        currentCompanyId.value = allCompanies.value[0].id;
      }

      // Subscribe to companies table
      unsubscribeCompanies = await electric.subscribe<SyncedCompany>({
        table: "companies",
        callbacks: {
          onInsert: async (company) => {
            await refreshCompanies();
            // Auto-select first company if none selected
            if (!currentCompanyId.value) {
              currentCompanyId.value = company.id;
            }
          },
          onUpdate: async () => {
            await refreshCompanies();
          },
          onDelete: async () => {
            await refreshCompanies();
            // Clear current if deleted company was selected
            if (
              currentCompanyId.value &&
              !allCompanies.value.find((c) => c.id === currentCompanyId.value)
            ) {
              currentCompanyId.value =
                allCompanies.value[0]?.id || null;
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

      // Subscribe to company_members table
      unsubscribeMembers = await electric.subscribe<SyncedCompanyMember>({
        table: "company_members",
        callbacks: {
          onInsert: async () => {
            await refreshMembers();
          },
          onUpdate: async () => {
            await refreshMembers();
          },
          onDelete: async () => {
            await refreshMembers();
          },
        },
      });

      // Subscribe to invites table
      unsubscribeInvites = await electric.subscribe<SyncedInvite>({
        table: "invites",
        callbacks: {
          onInsert: async () => {
            await refreshInvites();
          },
          onUpdate: async () => {
            await refreshInvites();
          },
          onDelete: async () => {
            await refreshInvites();
          },
        },
      });
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
    isLoading.value = false;
    isUpToDate.value = false;
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
    members: readonly(members),
    invites: readonly(invites),
    isLoading: readonly(isLoading),
    isUpToDate: readonly(isUpToDate),
    error: readonly(error),

    // Actions
    switchCompany,
    refreshCompanies,
    refreshMembers,
    refreshInvites,
    startSync,
    stopSync,
  };
};

export const useCompanies = createSharedComposable(_useCompanies);

/**
 * Helper composable to get current user's role in current company
 * Requires useCurrentUser to be used in the same component
 */
export function useCurrentCompanyRole() {
  const companies = useCompanies();
  const { user } = useCurrentUser();

  const myMembership = computed(() => {
    if (!companies.currentCompany.value || !user.value) return null;
    return companies.members.value.find((m) => m.user_id === user.value?.id);
  });

  const role = computed(() => myMembership.value?.role || null);

  const isOwner = computed(() => role.value === "owner");
  const isAdmin = computed(() => role.value === "admin" || role.value === "owner");
  const isMember = computed(() => !!role.value);

  const canManage = isAdmin;

  return {
    role,
    isOwner,
    isAdmin,
    isMember,
    canManage,
    membership: myMembership,
  };
}

/**
 * Helper composable for company-specific data operations
 */
export function useCompanyData(companyId?: string) {
  const companies = useCompanies();
  const pg = usePgWorker();

  const targetCompanyId = computed(() => companyId || companies.currentCompanyId.value);

  /**
   * Query data scoped to current/target company
   */
  async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const worker = await pg.init();
    // Add company_id filter automatically if table has it
    const result = await worker.query<T>(sql, params);
    return result.rows;
  }

  /**
   * Check if user has specific role in company
   */
  async function checkRole(userId: string, requiredRole: "owner" | "admin" | "member"): Promise<boolean> {
    const cid = targetCompanyId.value;
    if (!cid) return false;

    const worker = await pg.init();
    const result = await worker.query<{ role: string }>(
      "SELECT role FROM company_members WHERE company_id = $1 AND user_id = $2",
      [cid, userId]
    );

    if (result.rows.length === 0) return false;

    const role = result.rows[0].role;
    if (requiredRole === "member") return ["member", "admin", "owner"].includes(role);
    if (requiredRole === "admin") return ["admin", "owner"].includes(role);
    return role === "owner";
  }

  return {
    companyId: targetCompanyId,
    query,
    checkRole,
  };
}
