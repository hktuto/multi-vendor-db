import { createSharedComposable } from "@vueuse/core";
import { useElectricSync } from "./useElectricSync";
import { usePgWorker } from "./usePgWorker";
import type { SyncEventCallbacks } from "./useElectricSync";

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
 * User sync composable - manages user data sync using ShapeStream pattern
 * 
 * This composable:
 * - Uses useElectricSync for sync events (ShapeStream)
 * - Uses usePgWorker for data queries
 * - Does NOT manage data arrays - pages query themselves
 * - Provides helpers for user-specific operations
 * 
 * Uses createSharedComposable for singleton pattern
 */
const _useUserSync = () => {
  const electric = useElectricSync();
  const pg = usePgWorker();

  // Local state for tracking sync status
  const isSyncing = useState("user-sync-active", () => false);
  const isUpToDate = useState("user-sync-uptodate", () => false);
  const syncError = useState<Error | null>("user-sync-error", () => null);

  const config = useRuntimeConfig();
  const ELECTRIC_URL = config.public.electricUrl || "http://localhost:3000";

  /**
   * Ensure users table exists in PGlite
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
   * @param callbacks - Optional event callbacks
   * @returns Unsubscribe function
   */
  async function sync(
    callbacks: SyncEventCallbacks<SyncedUser> = {}
  ): Promise<() => void> {
    await ensureTable();

    // Reset local state
    isSyncing.value = true;
    isUpToDate.value = false;
    syncError.value = null;

    const unsubscribe = await electric.subscribe<SyncedUser>(
      "users",
      `${ELECTRIC_URL}/v1/shape`,
      {
        onInsert: (user) => {
          callbacks.onInsert?.(user);
        },
        onUpdate: (user, oldUser) => {
          callbacks.onUpdate?.(user, oldUser);
        },
        onDelete: (id) => {
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
      }
    );

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
   */
  async function getAllUsers(): Promise<SyncedUser[]> {
    const worker = await pg.init();
    const result = await worker.query<SyncedUser>(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    return result.rows;
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
  }

  /**
   * Delete a user (will sync to server)
   */
  async function deleteUser(userId: string): Promise<void> {
    const worker = await pg.init();
    await worker.query("DELETE FROM users WHERE id = $1", [userId]);
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

    // Sync control
    sync,
    stopSync,

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
