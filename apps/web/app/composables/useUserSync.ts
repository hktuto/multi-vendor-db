import type { SyncShapeToTableResult } from "@electric-sql/pglite-sync";
import { createSharedComposable } from "@vueuse/core";

/**
 * User table schema for Electric SQL sync
 */
export interface SyncedUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User sync composable - manages user data sync and CRUD operations
 * Uses createSharedComposable for singleton pattern
 */
const _useUserSync = () => {
  const {
    syncShape,
    unsyncShape,
    query,
    queryOne,
    exec,
    isSyncing,
    isConnected,
  } = useElectricSync();

  const currentUser = useState<SyncedUser | null>(
    "synced-current-user",
    () => null,
  );
  const users = useState<SyncedUser[]>("synced-users-list", () => []);
  const userShape = useState<SyncShapeToTableResult | null>(
    "user-shape",
    () => null,
  );
  const isUpToDate = useState("user-sync-up-to-date", () => false);

  const config = useRuntimeConfig();
  const ELECTRIC_URL = config.public.electricUrl || "http://localhost:3000";

  /**
   * Ensure users table exists in PGlite
   */
  async function ensureTable() {
    await exec(`
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
   * Start syncing user data for a specific user
   */
  async function syncUser(userId: string) {
    await ensureTable();
    // Stop existing sync
    if (userShape.value) {
      await unsyncShape("user-sync");
    }

    // Start new sync
    const shape = await syncShape(
      "user-sync",
      "users",
      `${ELECTRIC_URL}/v1/shape`,
      {
        primaryKey: ["id"],
      },
    );

    userShape.value = shape;

    // Watch isUpToDate status (it's a getter, so we poll)
    watchEffect(() => {
      isUpToDate.value = shape.isUpToDate;
      if (shape.isUpToDate) {
        console.log("User sync is up to date");
      }
    });

    // Load current user
    await loadCurrentUser(userId);

    return shape;
  }

  /**
   * Load current user from local DB
   */
  async function loadCurrentUser(userId: string) {
    const user = await queryOne<SyncedUser>(
      "SELECT * FROM users",
    );
    console.log("user",user, userId)
    currentUser.value = user;
    return user;
  }

  /**
   * Load all users from local DB
   */
  async function loadUsers() {
    const results = await query<SyncedUser>(
      "SELECT * FROM users ORDER BY created_at DESC",
    );
    users.value = results;
    return results;
  }

  /**
   * Create a new user (will sync to server)
   */
  async function createUser(
    data: Omit<SyncedUser, "created_at" | "updated_at">,
  ) {
    await exec(
      `INSERT INTO users (id, email, name, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [data.id, data.email, data.name, data.avatar_url],
    );

    // Reload to get updated data
    await loadUsers();

    // If this is the current user, update that too
    if (currentUser.value?.id === data.id) {
      await loadCurrentUser(data.id);
    }
  }

  /**
   * Update user data (will sync to server)
   */
  async function updateUser(
    userId: string,
    updates: Partial<Omit<SyncedUser, "id" | "created_at">>,
  ) {
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

    await exec(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${values.length}`,
      values,
    );

    // Reload to get updated data
    await loadUsers();

    if (currentUser.value?.id === userId) {
      await loadCurrentUser(userId);
    }
  }

  /**
   * Delete a user (will sync to server)
   */
  async function deleteUser(userId: string) {
    await exec("DELETE FROM users WHERE id = $1", [userId]);

    await loadUsers();

    if (currentUser.value?.id === userId) {
      currentUser.value = null;
    }
  }

  /**
   * Stop syncing and clear local user data
   * Call this on logout
   */
  async function clearUserData() {
    // Stop sync first
    if (userShape.value) {
      await unsyncShape("user-sync");
      userShape.value = null;
    }

    // Clear local data
    await exec("DELETE FROM users");

    // Reset state
    currentUser.value = null;
    users.value = [];
    isUpToDate.value = false;

    console.log("User data cleared on logout");
  }

  /**
   * Handle logout - clear data and stop sync
   */
  async function logout() {
    await clearUserData();
  }

  return {
    // State
    currentUser: readonly(currentUser),
    users: readonly(users),
    isSyncing: readonly(isSyncing),
    isConnected: readonly(isConnected),
    isUpToDate: readonly(isUpToDate),

    // Methods
    syncUser,
    loadCurrentUser,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    clearUserData,
    logout,
  };
};

export const useUserSync = createSharedComposable(_useUserSync);
