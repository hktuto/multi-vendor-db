import { createSharedComposable } from "@vueuse/core";
import { useElectricSync } from "./useElectricSync";
import { usePgWorker } from "./usePgWorker";
import type { SyncEventCallbacks, ShapeConfig } from "./useElectricSync";

/**
 * User table schema
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
  /** Shape key for subscription identification */
  shapeKey?: string;
}

/**
 * User sync composable - manages user data sync using syncShapeToTable pattern
 *
 * This composable:
 * - Uses useElectricSync with syncShapeToTable for automatic sync
 * - Uses usePgWorker for data queries
 * - Loads existing data from DB first, then starts sync for updates
 * - Optional auto-refresh on sync events
 * - Provides reactive `data` array for UI bindings
 *
 * Uses createSharedComposable for singleton pattern
 */
const _useUserSync = (options: UseUserSyncOptions = {}) => {
  const {
    autoRefresh = false,
    shapeKey = "users_sync",
  } = options;

  const electric = useElectricSync();
  const pg = usePgWorker();

  // Local state for tracking sync status
  const isSyncing = useState("user-sync-active", () => false);
  const isUpToDate = useState("user-sync-uptodate", () => false);
  const syncError = useState<Error | null>("user-sync-error", () => null);
  
  // Reactive data array - automatically updates when refresh() is called
  const data = useState<SyncedUser[]>("user-sync-data", () => []);

  const config = useRuntimeConfig();
  const ELECTRIC_URL = options.electricUrl || config.public.electricUrl || "http://localhost:3000";

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
   * Ensure users table exists in PGlite
   *
   * Note: syncShapeToTable handles table creation automatically,
   * but we keep this for backwards compatibility and manual operations
   */
  async function ensureTable(): Promise<void> {
    const worker = await pg.init();
    await worker.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        avatar_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Start syncing user data
   *
   * Uses useElectricSync for real-time sync:
   * 1. Load existing data from DB first (for immediate UI display)
   * 2. Then subscribe to Electric for real-time updates
   *
   * Multiple components can call sync() with the same shapeKey - 
   * they will share the underlying ShapeStream subscription.
   *
   * @param callbacks - Optional event callbacks
   * @returns Unsubscribe function
   */
  async function sync(
    callbacks: SyncEventCallbacks<SyncedUser> = {}
  ): Promise<() => void> {
    // Ensure table exists (for manual operations compatibility)
    await ensureTable();

    // Reset local state
    isSyncing.value = true;
    isUpToDate.value = false;
    syncError.value = null;

    // STEP 1: Load existing data from DB first
    // This ensures UI has data immediately, even before sync completes
    try {
      await loadUsers();
      console.log("[useUserSync] Initial data loaded from DB:", data.value.length, "users");
    } catch (error) {
      console.warn("[useUserSync] Failed to load initial data:", error);
      // Continue with sync even if initial load fails
    }

    // STEP 2: Start sync for real-time updates
    // This subscribes to the shared shape - if another component already
    // subscribed to 'users_sync', this will reuse the existing subscription
    const unsubscribe = await electric.subscribe<SyncedUser>({
      table: "users",
      shapeUrl: `${ELECTRIC_URL}/v1/shape`,
      shapeKey,
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
   * Query helpers - pages use these to query data themselves
   */

  /**
   * Get current user by ID
   */
  async function getCurrentUser(userId: string): Promise<SyncedUser | null> {
    const worker = await pg.init();
    const result = await worker.query<SyncedUser>(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );
    console.log("getCurrentUser", result, userId);
    return result.rows[0] || null;
  }

  /**
   * Get user by email
   */
  async function getUserByEmail(email: string): Promise<SyncedUser | null> {
    const worker = await pg.init();
    const result = await worker.query<SyncedUser>(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all users
   * @deprecated Use reactive `data` or `refresh()` instead
   */
  async function getAllUsers(): Promise<SyncedUser[]> {
    return await loadUsers();
  }

  /**
   * Search users by name or email
   */
  async function searchUsers(query: string): Promise<SyncedUser[]> {
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
   * Create a new user (will sync to server)
   */
  async function createUser(
    data: Omit<SyncedUser, "created_at" | "updated_at">
  ): Promise<void> {
    const worker = await pg.init();
    await worker.query(
      `INSERT INTO users (id, email, name, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [data.id, data.email, data.name, data.avatar_url]
    );
    if (autoRefresh) await refresh();
  }

  /**
   * Update user data (will sync to server)
   */
  async function updateUser(
    userId: string,
    updates: Partial<Omit<SyncedUser, "id" | "created_at">>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.email !== undefined) {
      fields.push("email = $" + (values.length + 1));
      values.push(updates.email);
    }
    if (updates.name !== undefined) {
      fields.push("name = $" + (values.length + 1));
      values.push(updates.name);
    }
    if (updates.avatar_url !== undefined) {
      fields.push("avatar_url = $" + (values.length + 1));
      values.push(updates.avatar_url);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(userId);

    const worker = await pg.init();
    await worker.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${values.length}`,
      values
    );
    if (autoRefresh) await refresh();
  }

  /**
   * Delete a user (will sync to server)
   */
  async function deleteUser(userId: string): Promise<void> {
    const worker = await pg.init();
    await worker.query("DELETE FROM users WHERE id = $1", [userId]);
    if (autoRefresh) await refresh();
  }

  /**
   * Clear all user data from local DB
   * Call this on logout
   */
  async function clearUserData(): Promise<void> {
    // Stop sync first
    stopSync();

    const worker = await pg.init();
    await worker.query("DELETE FROM users");
    
    // Clear reactive data
    data.value = [];

    console.log("User data cleared on logout");
  }

  /**
   * Handle logout - clear data and stop sync
   */
  async function logout(): Promise<void> {
    await clearUserData();
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

    // Query helpers (pages query themselves)
    getCurrentUser,
    getUserByEmail,
    getAllUsers,
    searchUsers,

    // Mutations
    createUser,
    updateUser,
    deleteUser,
    clearUserData,
    logout,
  };
};

export const useUserSync = createSharedComposable(_useUserSync);
