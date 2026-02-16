import { createSharedComposable } from "@vueuse/core";
import { useElectricSync, type SyncEventCallbacks } from "./useElectricSync";
import { usePgWorker } from "./usePgWorker";

/**
 * Generic table sync composable configuration
 */
export interface UseTableSyncOptions<T extends Record<string, any>> {
  /** Table name to sync */
  table: string;
  /** Event callbacks for sync events */
  callbacks?: SyncEventCallbacks<T>;
  /** Auto-refresh data when sync events fire */
  autoRefresh?: boolean;
}

/**
 * Generic table sync composable - automatically manages sync lifecycle
 *
 * Usage:
 * ```ts
 * // Basic usage - auto syncs on mount, auto cleanup on unmount
 * const { data, status, refresh, isSyncing, isUpToDate } = useTableSync({
 *   table: 'users',
 *   callbacks: {
 *     onInsert: (user) => console.log('New:', user),
 *     onUpdate: (user) => console.log('Updated:', user),
 *   }
 * })
 *
 * // Query data
 * const users = await data.query('SELECT * FROM users')
 * const user = await data.queryOne('SELECT * FROM users WHERE id = $1', [id])
 *
 * // Or use live query
 * const { initialData, subscribe } = await data.liveQuery('SELECT * FROM users')
 * subscribe((rows) => console.log('Live update:', rows))
 * ```
 */
export function useTableSync<T extends Record<string, any>>(
  options: UseTableSyncOptions<T>
) {
  const { table, callbacks = {}, autoRefresh = false } = options;

  const electric = useElectricSync();
  const pg = usePgWorker();

  // Sync status
  const isSyncing = ref(false);
  const isUpToDate = ref(false);
  const error = ref<Error | null>(null);

  // Data cache
  const rows = ref<T[]>([]);

  let unsubscribeFn: (() => void) | null = null;

  // Start sync on mount
  onMounted(async () => {
    isSyncing.value = true;
    error.value = null;

    try {
      // Load initial data
      await refresh();

      // Start sync
      unsubscribeFn = await electric.subscribe<T>({
        table,
        callbacks: {
          ...callbacks,
          onInsert: async (data) => {
            if (autoRefresh) await refresh();
            callbacks.onInsert?.(data);
          },
          onUpdate: async (data, oldData) => {
            if (autoRefresh) await refresh();
            callbacks.onUpdate?.(data, oldData);
          },
          onDelete: async (id) => {
            if (autoRefresh) await refresh();
            callbacks.onDelete?.(id);
          },
          onUpToDate: () => {
            isUpToDate.value = true;
            isSyncing.value = false;
            callbacks.onUpToDate?.();
          },
          onError: (err) => {
            error.value = err;
            isSyncing.value = false;
            callbacks.onError?.(err);
          },
        },
      });
    } catch (err) {
      error.value = err as Error;
      isSyncing.value = false;
    }
  });

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribeFn?.();
    isSyncing.value = false;
    isUpToDate.value = false;
  });

  /**
   * Refresh data from local database
   */
  async function refresh(): Promise<T[]> {
    const worker = await pg.init();
    const result = await worker.query<T>(`SELECT * FROM ${table}`);
    rows.value = result.rows;
    return result.rows;
  }

  /**
   * Execute custom query
   */
  async function query(sql: string, params?: any[]): Promise<T[]> {
    const worker = await pg.init();
    const result = await worker.query<T>(sql, params);
    return result.rows;
  }

  /**
   * Execute query for single result
   */
  async function queryOne(sql: string, params?: any[]): Promise<T | null> {
    const rows = await query(sql, params);
    return rows[0] || null;
  }

  /**
   * Create a live query subscription
   */
  async function liveQuery(
    sql: string,
    params?: any[]
  ): Promise<{
    initialData: T[];
    subscribe: (callback: (rows: T[]) => void) => (() => void);
  }> {
    const worker = await pg.init();
    const liveExt = (worker as any).live;
    
    if (!liveExt) {
      throw new Error('Live extension not available');
    }

    const result = await liveExt.query(sql, params);

    return {
      initialData: result.rows,
      subscribe: (callback: (rows: T[]) => void) => {
        const unsub = result.subscribe((res: { rows: T[] }) => {
          callback(res.rows);
        });
        return unsub;
      },
    };
  }

  return {
    // Status
    isSyncing: readonly(isSyncing),
    isUpToDate: readonly(isUpToDate),
    error: readonly(error),
    
    // Data
    rows: readonly(rows),
    
    // Methods
    refresh,
    
    // Query helpers
    query,
    queryOne,
    liveQuery,
  };
}

/**
 * Pre-configured composables for specific tables
 * These wrap useTableSync with proper typing
 */

export interface SyncedUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

/**
 * Current user composable - provides reactive current user data
 *
 * Usage:
 * ```ts
 * const { user, isSyncing } = useCurrentUser({
 *   onUpdate: (user) => console.log('Updated:', user)
 * })
 *
 * // Access reactive data
 * console.log(user.value?.name)
 * ```
 */
export function useCurrentUser(options: SyncEventCallbacks<SyncedUser> = {}) {
  const { rows, isSyncing, isUpToDate, error, refresh, query, queryOne, liveQuery } = 
    useTableSync<SyncedUser>({
      table: 'users',
      callbacks: options,
      autoRefresh: true,
    });

  // Get first user (current user) from synced data
  const user = computed(() => rows.value[0] || null);

  return {
    user,
    isSyncing,
    isUpToDate,
    error,
    refresh,
    query,
    queryOne,
    liveQuery,
  };
}

/**
 * Companies sync composable
 *
 * Usage:
 * ```ts
 * const { rows: companies, isSyncing } = useCompaniesSync()
 * ```
 */
export interface SyncedCompany {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export function useCompaniesSync(options: SyncEventCallbacks<SyncedCompany> = {}) {
  return useTableSync<SyncedCompany>({
    table: 'companies',
    callbacks: options,
    autoRefresh: true,
  });
}

/**
 * Company members sync composable
 */
export interface SyncedCompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  [key: string]: any;
}

export function useCompanyMembersSync(options: SyncEventCallbacks<SyncedCompanyMember> = {}) {
  return useTableSync<SyncedCompanyMember>({
    table: 'company_members',
    callbacks: options,
    autoRefresh: true,
  });
}
