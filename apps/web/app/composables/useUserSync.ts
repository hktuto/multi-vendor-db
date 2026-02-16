import { createSharedComposable } from "@vueuse/core";
import { useElectricSync } from "./useElectricSync";
import { usePgWorker } from "./usePgWorker";
import type { SyncEventCallbacks } from "./useElectricSync";

/**
 * User table schema (from Electric SQL sync)
 */
export interface SyncedUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: string | null; // Index signature for Row constraint
}

/**
 * Configuration for useUserSync
 */
export interface UseUserSyncOptions {
  /** Auto-refresh data when sync events fire (insert/update/delete) */
  autoRefresh?: boolean;
  /** Electric URL (defaults to runtime config) */
  electricUrl?: string;
}

/**
 * User sync composable - READ-ONLY local data access
 *
 * This composable provides:
 * - Real-time sync from server to local PGlite via Electric SQL
 * - Reactive data array for UI bindings
 * - Query helpers for reading local user data
 *
 * IMPORTANT: This composable is READ-ONLY. All mutations (create/update/delete)
 * must go through API endpoints. The local PGlite database is a cache/mirror
 * that syncs from the server, not a source of truth.
 *
 * Data flow:
 *   Write: Component → API → PostgreSQL → Electric → PGlite (local)
 *   Read:  Component ← PGlite (local) ← Electric ← PostgreSQL
 *
 * Uses createSharedComposable for singleton pattern across the app.
 */
const _useUserSync = (options: UseUserSyncOptions = {}) => {
  const { autoRefresh = false } = options;

  const electric = useElectricSync();
  const pg = usePgWorker();

  // Local state for tracking sync status
  const isSyncing = useState("user-sync-active", () => false);
  const isUpToDate = useState("user-sync-uptodate", () => false);
  const syncError = useState<Error | null>("user-sync-error", () => null);

  // Reactive data array - automatically updates when refresh() is called
  const data = useState<SyncedUser[]>("user-sync-data", () => []);

  const config = useRuntimeConfig();
  const ELECTRIC_URL =
    options.electricUrl || config.public.electricUrl || "http://localhost:3000";

  /**
   * Load all users from local database
   * Called initially and for manual refresh
   */
  async function loadUsers(): Promise<SyncedUser[]> {
    const worker = await pg.init();
    const result = await worker.query<SyncedUser>(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    const users = result.rows;
    data.value = users;
    return users;
  }

  /**
   * Refresh data from local database
   * Can be called manually or automatically on sync events
   */
  async function refresh(): Promise<SyncedUser[]> {
    console.log("[useUserSync] Refreshing user data...");
    return await loadUsers();
  }

  /**
   * Start syncing user data from server to local DB
   *
   * This subscribes to the 'users' table via Electric SQL.
   * Multiple components can call sync() - they will share the same subscription.
   *
   * Note: This is read-only sync. Data flows from server to local only.
   * To create/update/delete users, use the API endpoints instead.
   *
   * @param callbacks - Optional event callbacks for sync events
   * @returns Unsubscribe function
   */
  async function sync(
    callbacks: SyncEventCallbacks<SyncedUser> = {}
  ): Promise<() => void> {
    // Reset local state
    isSyncing.value = true;
    isUpToDate.value = false;
    syncError.value = null;

    // STEP 1: Load existing data from DB first
    // This ensures UI has data immediately, even before sync completes
    try {
      await loadUsers();
      console.log(
        "[useUserSync] Initial data loaded from DB:",
        data.value.length,
        "users"
      );
    } catch (error) {
      console.warn("[useUserSync] Failed to load initial data:", error);
      // Continue with sync even if initial load fails
    }

    // STEP 2: Start sync for real-time updates
    // Multiple components calling sync() will share the same underlying subscription
    const unsubscribe = await electric.subscribe<SyncedUser>({
      table: "users",
      shapeUrl: `${ELECTRIC_URL}/v1/shape`,
      callbacks: {
        onInsert: async (user) => {
          if (autoRefresh) await refresh();
          callbacks.onInsert?.(user);
        },
        onUpdate: async (user, oldUser) => {
          if (autoRefresh) await refresh();
          callbacks.onUpdate?.(user, oldUser);
        },
        onDelete: async (id) => {
          if (autoRefresh) await refresh();
          callbacks.onDelete?.(id);
        },
        onError: (error) => {
          syncError.value = error;
          isSyncing.value = false;
          callbacks.onError?.(error);
        },
        onUpToDate: () => {
          isUpToDate.value = true;
          isSyncing.value = false;
          callbacks.onUpToDate?.();
        },
      },
    });

    return unsubscribe;
  }

  /**
   * Stop syncing user data
   */
  function stopSync(): void {
    electric.unsubscribe("users");
    isSyncing.value = false;
    isUpToDate.value = false;
  }

  /**
   * Query helpers - READ ONLY
   * These query the local synced data, not the server.
   */

  /**
   * Get user by ID from local DB
   */
  async function getById(userId: string): Promise<SyncedUser | null> {
    const worker = await pg.init();
    const result = await worker.query<SyncedUser>(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user by email from local DB
   */
  async function getByEmail(email: string): Promise<SyncedUser | null> {
    const worker = await pg.init();
    const result = await worker.query<SyncedUser>(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all users from local DB
   */
  async function getAll(): Promise<SyncedUser[]> {
    return await loadUsers();
  }

  /**
   * Search users by name or email from local DB
   */
  async function search(query: string): Promise<SyncedUser[]> {
    const worker = await pg.init();
    const result = await worker.query<SyncedUser>(
      `SELECT * FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY created_at DESC`,
      [`%${query}%`]
    );
    return result.rows;
  }

  /**
   * Handle logout - stop sync and clear local data
   * Call this when user logs out
   */
  async function logout(): Promise<void> {
    stopSync();
    data.value = [];
    console.log("[useUserSync] Logged out, sync stopped");
  }

  return {
    // State (readonly)
    isSyncing: readonly(isSyncing),
    isUpToDate: readonly(isUpToDate),
    error: readonly(syncError),

    // Reactive data (auto-updates with autoRefresh or manual refresh)
    data: readonly(data),

    // Sync control
    sync,
    stopSync,
    refresh,

    // Query helpers (read-only, local data)
    getById,
    getByEmail,
    getAll,
    search,

    // Logout
    logout,
  };
};

export const useUserSync = createSharedComposable(_useUserSync);

/**
 * Usage example:
 *
 * ```ts
 * // In a component
 * const userSync = useUserSync()
 *
 * // Start syncing (read-only from server)
 * await userSync.sync({
 *   onInsert: (user) => console.log('New user:', user),
 *   onUpdate: (user) => console.log('Updated:', user),
 * })
 *
 * // Read local data
 * const users = await userSync.getAll()
 * // or use reactive data
 * console.log(userSync.data.value)
 *
 * // To CREATE a user - use API, not this composable!
 * const newUser = await $fetch('/api/users', {
 *   method: 'POST',
 *   body: { name: 'John', email: 'john@example.com' }
 * })
 * // Electric will sync the new user to local DB automatically
 * ```
 */
