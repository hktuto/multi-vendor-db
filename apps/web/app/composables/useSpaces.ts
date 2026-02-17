import { createSharedComposable } from "@vueuse/core";
import { useElectricSync, type SyncEventCallbacks } from "./useElectricSync";
import { usePgWorker } from "./usePgWorker";
import { useCurrentUser } from "./useTableSync";
import { useCompanies } from "./useCompanies";

/**
 * Space data structure (synced from Electric SQL)
 */
export interface SyncedSpace {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  settings: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Space member data structure
 */
export interface SyncedSpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: "admin" | "editor" | "viewer";
  joined_at: string;
  invited_by: string | null;
}

/**
 * Space item (folder/table/view/dashboard) data structure
 */
export interface SyncedSpaceItem {
  id: string;
  space_id: string;
  parent_id: string | null;
  type: "folder" | "table" | "view" | "dashboard";
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order_index: number;
  config: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Input for creating a new space
 */
export interface CreateSpaceInput {
  companyId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  settings?: Record<string, any>;
}

/**
 * Input for updating a space
 */
export interface UpdateSpaceInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  settings?: Record<string, any>;
}

/**
 * Space sync composable with current space management
 *
 * Architecture:
 * - Spaces: Global state (Electric Sync) - frequently switched, need instant availability
 * - Space Items: Query-on-demand - large data, fetched per space
 * - Space Members: Query-on-demand - only needed on members page
 *
 * Similar to useCompanies() pattern:
 * - allSpaces: All spaces from companies user has access to
 * - currentSpaceId: Currently selected space
 * - switchSpace(): Change current space
 *
 * Usage:
 * ```ts
 * const { allSpaces, currentSpace, currentSpaceId, switchSpace, isLoading } = useSpaces()
 *
 * // Access all spaces
 * console.log(allSpaces.value)
 *
 * // Access current space
 * console.log(currentSpace.value?.name)
 *
 * // Switch space
 * await switchSpace(spaceId)
 *
 * // Query items for current space (on-demand)
 * const items = await queryItems(currentSpaceId.value)
 * ```
 */
const _useSpaces = () => {
  const electric = useElectricSync();
  const pg = usePgWorker();
  const {loggedIn, user:currentUser} = useUserSession();
  // const { currentUser } = useUserSync();
  const { allCompanies, currentCompanyId } = useCompanies();

  // Global state - current selected space
  const currentSpaceId = useState<string | null>("spaces-current-id", () => null);

  // Global state - all spaces (synced from all accessible companies)
  const allSpaces = useState<SyncedSpace[]>("spaces-all", () => []);

  // Loading states
  const isLoading = useState("spaces-loading", () => false);
  const isSyncing = useState("spaces-syncing", () => false);
  const syncError = useState<Error | null>("spaces-error", () => null);

  // Track subscription cleanup
  let unsubscribeSpaces: (() => void) | null = null;
  let unsubscribeSpaceMembers: (() => void) | null = null;
  let unsubscribeSpaceItems: (() => void) | null = null;
  let unsubscribeUsers: (() => void) | null = null;

  /**
   * Current space computed from allSpaces
   */
  const currentSpace = computed<SyncedSpace | undefined>(() => {
    if (!currentSpaceId.value) return undefined;
    return allSpaces.value.find((s) => s.id === currentSpaceId.value);
  });

  /**
   * Spaces filtered by current company
   * Auto-updates when currentCompany changes (no re-sync needed)
   */
  const currentCompanySpaces = computed<SyncedSpace[]>(() => {
    if (!currentCompanyId.value) return [];
    return allSpaces.value
      .filter((s) => s.company_id === currentCompanyId.value)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  /**
   * Watch for company changes and auto-adjust current space
   * - If current space belongs to new company: keep it
   * - If not: switch to first space of new company (or null if none)
   */
  watch(
    () => currentCompanyId.value,
    (newCompanyId, oldCompanyId) => {
      if (!newCompanyId) {
        // No company selected, clear current space
        currentSpaceId.value = null;
        return;
      }

      // Check if current space belongs to new company
      const currentSpaceBelongsToCompany = currentSpace.value?.company_id === newCompanyId;

      if (!currentSpaceBelongsToCompany) {
        // Current space not in new company, switch to first available
        const firstSpace = currentCompanySpaces.value[0];
        if (firstSpace) {
          console.log(`[useSpaces] Company changed ${oldCompanyId} -> ${newCompanyId}, switching to space: ${firstSpace.name}`);
          currentSpaceId.value = firstSpace.id;
        } else {
          console.log(`[useSpaces] Company changed ${oldCompanyId} -> ${newCompanyId}, no spaces available`);
          currentSpaceId.value = null;
        }
      }
    },
    { immediate: true }
  );

  /**
   * Get current user's role in a space
   * Query-on-demand (not stored in state)
   */
  async function getMySpaceRole(spaceId: string): Promise<{
    role: SyncedSpaceMember["role"] | null;
    isAdmin: boolean;
    isEditor: boolean;
    canManage: boolean;
  }> {
    if (!currentUser.value) {
      return { role: null, isAdmin: false, isEditor: false, canManage: false };
    }

    const worker = await pg.init();
    const result = await worker.query<{ role: SyncedSpaceMember["role"] }>(
      "SELECT role FROM space_members WHERE space_id = $1 AND user_id = $2",
      [spaceId, currentUser.value.id],
    );

    if (result.rows.length === 0) {
      return { role: null, isAdmin: false, isEditor: false, canManage: false };
    }

    const role = result.rows[0]?.role ?? null;
    const isAdmin = role === "admin";
    const isEditor = isAdmin || role === "editor";
    const canManage = isAdmin;

    return { role, isAdmin, isEditor, canManage };
  }

  /**
   * Switch to a different space
   */
  async function switchSpace(spaceId: string | null): Promise<void> {
    if (spaceId === currentSpaceId.value) return;
    currentSpaceId.value = spaceId;
  }

  /**
   * Refresh spaces data from local PGlite
   */
  async function refreshSpaces(): Promise<void> {
    if (allCompanies.value.length === 0) {
      allSpaces.value = [];
      return;
    }

    isLoading.value = true;
    try {
      const worker = await pg.init();
      const companyIds = allCompanies.value.map((c) => c.id);

      // Build IN clause for SQLite compatibility
      // SQLite doesn't support ANY($1) array syntax
      const placeholders = companyIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await worker.query<SyncedSpace>(
        `SELECT * FROM spaces
         WHERE company_id IN (${placeholders})
         AND deleted_at IS NULL
         ORDER BY name`,
        companyIds,
      );

      allSpaces.value = result.rows;

      // If current space is no longer valid, clear it
      if (
        currentSpaceId.value &&
        !allSpaces.value.find((s) => s.id === currentSpaceId.value)
      ) {
        currentSpaceId.value = null;
      }
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Create a new space via API
   */
  async function createSpace(input: CreateSpaceInput): Promise<SyncedSpace> {
    const response = await $fetch<SyncedSpace>("/api/spaces", {
      method: "POST",
      body: input,
    });

    // Refresh will happen via Electric sync, but we can optimistically add
    allSpaces.value = [...allSpaces.value, response];

    // Auto-switch to new space
    await switchSpace(response.id);

    return response;
  }

  /**
   * Update a space via API
   */
  async function updateSpace(
    spaceId: string,
    input: UpdateSpaceInput,
  ): Promise<void> {
    await $fetch(`/api/spaces/${spaceId}`, {
      method: "PATCH",
      body: input,
    });

    // Optimistic update
    const index = allSpaces.value.findIndex((s) => s.id === spaceId);
    if (index !== -1) {
      allSpaces.value[index] = { ...allSpaces.value[index], ...input };
    }
  }

  /**
   * Archive/delete a space via API
   */
  async function archiveSpace(spaceId: string): Promise<void> {
    await $fetch(`/api/spaces/${spaceId}`, {
      method: "DELETE",
    });

    // Optimistic remove
    allSpaces.value = allSpaces.value.filter((s) => s.id !== spaceId);

    // Clear current if archived
    if (currentSpaceId.value === spaceId) {
      currentSpaceId.value = null;
    }
  }

  /**
   * Start syncing spaces
   * Syncs all spaces from companies user has access to
   */
  async function startSync(): Promise<void> {
    if (isSyncing.value) return;

    isSyncing.value = true;
    syncError.value = null;

    try {
      // Wait for companies to be available
      if (allCompanies.value.length === 0) {
        // Retry after a short delay
        setTimeout(() => startSync(), 500);
        return;
      }

      const companyIds = allCompanies.value.map((c) => c.id);

      // Subscribe to spaces table (filtered by accessible companies)
      // Note: This will be enhanced with proper auth proxy where clause later
      unsubscribeSpaces = await electric.subscribe<SyncedSpace>({
        table: "spaces",
        callbacks: {
          onInsert: (space) => {
            // Only add if from accessible company
            if (companyIds.includes(space.company_id)) {
              const exists = allSpaces.value.find((s) => s.id === space.id);
              if (!exists) {
                allSpaces.value = [...allSpaces.value, space];
              }
            }
          },
          onUpdate: (space) => {
            const index = allSpaces.value.findIndex((s) => s.id === space.id);
            if (index !== -1) {
              allSpaces.value[index] = space;
            }
          },
          onDelete: (id) => {
            allSpaces.value = allSpaces.value.filter((s) => s.id !== id);
            if (currentSpaceId.value === id) {
              currentSpaceId.value = null;
            }
          },
          onError: (error) => {
            syncError.value = error;
            console.error("Spaces sync error:", error);
          },
        },
      });

      // Subscribe to space_members table for member queries
      unsubscribeSpaceMembers = await electric.subscribe<SyncedSpaceMember>({
        table: "space_members",
        callbacks: {
          onError: (error) => {
            console.error("Space members sync error:", error);
          },
        },
      });

      // Subscribe to users table for member user info
      unsubscribeUsers = await electric.subscribe({
        table: "users",
        callbacks: {
          onError: (error) => {
            console.error("Users sync error:", error);
          },
        },
      });

      // Subscribe to space_items table
      unsubscribeSpaceItems = await electric.subscribe<SyncedSpaceItem>({
        table: "space_items",
        callbacks: {
          onError: (error) => {
            console.error("Space items sync error:", error);
          },
        },
      });

      // Initial load
      await refreshSpaces();

      // Set first space as current if none selected
      if (!currentSpaceId.value && allSpaces.value.length > 0) {
        currentSpaceId.value = allSpaces.value[0]?.id ?? null;
      }
    } catch (error) {
      syncError.value = error as Error;
      console.error("Failed to start spaces sync:", error);
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Stop syncing spaces
   */
  function stopSync(): void {
    if (unsubscribeSpaces) {
      unsubscribeSpaces();
      unsubscribeSpaces = null;
    }
    if (unsubscribeSpaceMembers) {
      unsubscribeSpaceMembers();
      unsubscribeSpaceMembers = null;
    }
    if (unsubscribeSpaceItems) {
      unsubscribeSpaceItems();
      unsubscribeSpaceItems = null;
    }
    if (unsubscribeUsers) {
      unsubscribeUsers();
      unsubscribeUsers = null;
    }
    isSyncing.value = false;
  }

  /**
   * ==================== QUERY-ON-DEMAND ====================
   *
   * These functions query PGlite on-demand, not stored in global state
   * Similar to useCompanyQueries pattern
   */

  /**
   * Query items for a specific space
   */
  async function queryItems(spaceId: string): Promise<SyncedSpaceItem[]> {
    const worker = await pg.init();
    const result = await worker.query<SyncedSpaceItem>(
      `SELECT * FROM space_items
       WHERE space_id = $1
       AND deleted_at IS NULL
       ORDER BY parent_id NULLS FIRST, order_index, name`,
      [spaceId],
    );
    return result.rows;
  }

  /**
   * Query members for a specific space
   */
  async function queryMembers(spaceId: string): Promise<SyncedSpaceMember[]> {
    const worker = await pg.init();
    const result = await worker.query<SyncedSpaceMember & { user: { name: string; email: string; avatar_url: string } }>(
      `SELECT sm.*,
        json_build_object(
          'name', u.name,
          'email', u.email,
          'avatar_url', u.avatar_url
        ) as user
       FROM space_members sm
       LEFT JOIN users u ON sm.user_id = u.id
       WHERE sm.space_id = $1
       ORDER BY sm.joined_at`,
      [spaceId],
    );
    return result.rows;
  }

  /**
   * Build tree structure from flat items list
   */
  function buildItemTree(
    items: SyncedSpaceItem[],
    parentId: string | null = null,
    level = 0,
  ): Array<SyncedSpaceItem & { children: ReturnType<typeof buildItemTree>; level: number }> {
    const children = items
      .filter((item) => item.parent_id === parentId)
      .sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name));

    return children.map((item) => ({
      ...item,
      children: buildItemTree(items, item.id, level + 1),
      level,
    }));
  }

  // Auto-start sync when companies are available
  watch(
    () => allCompanies.value.length,
    (length) => {
      if (length > 0 && !isSyncing.value) {
        startSync();
      }
    },
    { immediate: true },
  );

  // Cleanup on scope dispose
  onScopeDispose(() => {
    stopSync();
  });

  return {
    // State
    allSpaces,
    currentSpaceId,
    currentSpace,
    currentCompanySpaces, // ← 新增：當前公司的 spaces 列表
    isLoading,
    isSyncing,
    syncError,

    // Actions
    switchSpace,
    refreshSpaces,
    createSpace,
    updateSpace,
    archiveSpace,
    getMySpaceRole,
    startSync,
    stopSync,

    // Query-on-demand
    queryItems,
    queryMembers,
    buildItemTree,
  };
};

/**
 * Shared composable - state is preserved across components
 */
export const useSpaces = createSharedComposable(_useSpaces);

/**
 * Convenience composable for current space queries
 * Combines useSpaces with query-on-demand
 */
export function useCurrentSpace() {
  const spaces = useSpaces();

  const items = useState<SyncedSpaceItem[]>("current-space-items", () => []);
  const members = useState<SyncedSpaceMember[]>("current-space-members", () => []);
  const isLoadingItems = useState("current-space-loading-items", () => false);
  const isLoadingMembers = useState("current-space-loading-members", () => false);

  /**
   * Load items for current space
   */
  async function loadItems(): Promise<void> {
    if (!spaces.currentSpaceId.value) {
      items.value = [];
      return;
    }
    isLoadingItems.value = true;
    try {
      items.value = await spaces.queryItems(spaces.currentSpaceId.value);
    } finally {
      isLoadingItems.value = false;
    }
  }

  /**
   * Load members for current space
   */
  async function loadMembers(): Promise<void> {
    if (!spaces.currentSpaceId.value) {
      members.value = [];
      return;
    }
    isLoadingMembers.value = true;
    try {
      members.value = await spaces.queryMembers(spaces.currentSpaceId.value);
    } finally {
      isLoadingMembers.value = false;
    }
  }

  // Auto-reload when space changes
  watch(
    () => spaces.currentSpaceId.value,
    () => {
      loadItems();
      loadMembers();
    },
    { immediate: true },
  );

  return {
    // From useSpaces
    ...spaces,

    // Current space specific
    items,
    members,
    isLoadingItems,
    isLoadingMembers,
    loadItems,
    loadMembers,
  };
}
