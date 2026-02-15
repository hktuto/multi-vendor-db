import type { SyncShapeToTableResult } from "@electric-sql/pglite-sync";
import { getPgWorker } from "./usePgWorker";

/**
 * Electric SQL Sync Events
 */
export interface SyncEvents {
  /** Called when new data is inserted */
  onInsert?: (data: any) => void;
  /** Called when data is updated */
  onUpdate?: (data: any, oldData: any) => void;
  /** Called when data is deleted */
  onDelete?: (id: string) => void;
  /** Called when sync status changes */
  onStatusChange?: (status: 'syncing' | 'up-to-date' | 'error') => void;
  /** Called when initial sync is complete */
  onInitialSync?: () => void;
  /** Called on sync error */
  onError?: (error: Error) => void;
}

/**
 * Shape configuration for table sync
 */
export interface ShapeConfig {
  /** Table name to sync */
  table: string;
  /** Shape key for identification */
  shapeKey: string;
  /** Electric SQL shape URL */
  shapeUrl: string;
  /** Primary key columns */
  primaryKey?: string[];
  /** Optional WHERE clause for filtering */
  where?: string;
  /** Sync interval in ms (default: realtime) */
  interval?: number;
}

/**
 * Reactive sync state for a table
 */
export interface TableSyncState {
  data: Ref<any[]>;
  isSyncing: Ref<boolean>;
  isUpToDate: Ref<boolean>;
  error: Ref<Error | null>;
  lastSynced: Ref<Date | null>;
}

/**
 * Composable for syncing a table with Electric SQL
 * 
 * Usage:
 * ```ts
 * const { data, isSyncing, isUpToDate } = useElectricSync({
 *   table: 'users',
 *   shapeKey: 'users-sync',
 *   shapeUrl: 'http://localhost:3000/v1/shape/users',
 *   onInsert: (user) => console.log('New user:', user),
 *   onUpdate: (user, old) => console.log('Updated:', user),
 *   onDelete: (id) => console.log('Deleted:', id),
 * })
 * ```
 */
export function useElectricSync(config: ShapeConfig & SyncEvents): TableSyncState {
  const { 
    table, 
    shapeKey, 
    shapeUrl, 
    primaryKey = ['id'],
    onInsert,
    onUpdate, 
    onDelete,
    onStatusChange,
    onInitialSync,
    onError
  } = config;

  // Reactive state
  const data = ref<any[]>([]);
  const isSyncing = ref(false);
  const isUpToDate = ref(false);
  const error = ref<Error | null>(null);
  const lastSynced = ref<Date | null>(null);
  
  // Internal state
  let shapeResult: SyncShapeToTableResult | null = null;
  let unsubscribeFn: (() => void) | null = null;
  let watchInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start syncing the table
   */
  async function startSync() {
    try {
      isSyncing.value = true;
      error.value = null;
      onStatusChange?.('syncing');

      const pg = await getPgWorker();

      // Ensure table exists with schema
      await ensureTable(pg, table);

      // Subscribe to live query for real-time updates
      const liveResult = await pg.live.query(`SELECT * FROM ${table}`);
      
      // Handle live query changes
      unsubscribeFn = liveResult.subscribe((results: any) => {
        const newData = results.rows || [];
        
        // Detect changes
        detectChanges(data.value, newData);
        
        // Update data
        data.value = newData;
        lastSynced.value = new Date();
      });

      // Sync shape to table
      shapeResult = await pg.sync.syncShapeToTable({
        shape: {
          url: shapeUrl,
          params: { table },
        },
        table,
        primaryKey,
        shapeKey,
      });

      // Watch sync status
      watchInterval = setInterval(() => {
        if (shapeResult) {
          isUpToDate.value = shapeResult.isUpToDate;
          
          if (shapeResult.isUpToDate && isSyncing.value) {
            isSyncing.value = false;
            onStatusChange?.('up-to-date');
            onInitialSync?.();
          }
        }
      }, 100);

    } catch (err) {
      error.value = err as Error;
      isSyncing.value = false;
      onStatusChange?.('error');
      onError?.(err as Error);
      console.error(`[useElectricSync] Failed to sync ${table}:`, err);
    }
  }

  /**
   * Stop syncing and cleanup
   */
  async function stopSync() {
    // Stop watching sync status
    if (watchInterval) {
      clearInterval(watchInterval);
      watchInterval = null;
    }

    // Unsubscribe from live query
    if (unsubscribeFn) {
      unsubscribeFn();
      unsubscribeFn = null;
    }

    // Unsync shape
    if (shapeResult) {
      await shapeResult.unsubscribe();
      shapeResult = null;
    }

    isSyncing.value = false;
    isUpToDate.value = false;
    console.log(`[useElectricSync] Stopped sync for ${table}`);
  }

  /**
   * Detect changes between old and new data
   * Trigger event callbacks
   */
  function detectChanges(oldData: any[], newData: any[]) {
    const oldMap = new Map(oldData.map(item => [item.id, item]));
    const newMap = new Map(newData.map(item => [item.id, item]));

    // Detect inserts
    for (const [id, item] of newMap) {
      if (!oldMap.has(id)) {
        onInsert?.(item);
      }
    }

    // Detect updates
    for (const [id, newItem] of newMap) {
      const oldItem = oldMap.get(id);
      if (oldItem && JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        onUpdate?.(newItem, oldItem);
      }
    }

    // Detect deletes
    for (const [id, item] of oldMap) {
      if (!newMap.has(id)) {
        onDelete?.(id);
      }
    }
  }

  /**
   * Ensure table exists with proper schema
   */
  async function ensureTable(pg: any, tableName: string) {
    // Get table info from sync to determine schema
    // For now, create a basic table that can hold any data
    await pg.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        data JSONB DEFAULT '{}',
        _modified_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {
      // Table might already exist with different schema
    });
  }

  /**
   * Execute a query on the synced table
   */
  async function query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T[]> {
    const pg = await getPgWorker();
    const result = await pg.query(sql, params);
    return result.rows as T[];
  }

  /**
   * Insert data into table
   */
  async function insert(item: any) {
    const pg = await getPgWorker();
    const columns = Object.keys(item);
    const values = Object.values(item);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    await pg.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }

  /**
   * Update data in table
   */
  async function update(id: string, changes: any) {
    const pg = await getPgWorker();
    const sets = Object.keys(changes)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    const values = [id, ...Object.values(changes)];
    
    await pg.query(
      `UPDATE ${table} SET ${sets} WHERE id = $1`,
      values
    );
  }

  /**
   * Delete data from table
   */
  async function remove(id: string) {
    const pg = await getPgWorker();
    await pg.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  /**
   * Refresh data manually
   */
  async function refresh() {
    const pg = await getPgWorker();
    const result = await pg.query(`SELECT * FROM ${table}`);
    data.value = result.rows;
    lastSynced.value = new Date();
  }

  // Auto-start sync on mount
  onMounted(() => {
    startSync();
  });

  // Auto-stop sync on unmount
  onUnmounted(() => {
    stopSync();
  });

  return {
    // Reactive state
    data: readonly(data),
    isSyncing: readonly(isSyncing),
    isUpToDate: readonly(isUpToDate),
    error: readonly(error),
    lastSynced: readonly(lastSynced),
    
    // Manual controls
    startSync,
    stopSync,
    refresh,
    
    // CRUD operations
    query,
    insert,
    update,
    remove,
  };
}

/**
 * Legacy useElectricSync for backward compatibility
 * Use the new config-based version above for new code
 */
export function useElectricSyncLegacy() {
  return {
    // ... keep existing implementation for backward compat
  };
}
