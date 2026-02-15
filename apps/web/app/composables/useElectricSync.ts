import type {
  SyncShapeToTableResult,
  PGliteWithSync,
} from "@electric-sql/pglite-sync";
import { ShapeStream, Shape } from "@electric-sql/client";
import { getPgWorker } from "./usePgWorker";

/**
 * Electric SQL Sync Event Callbacks
 */
export interface SyncEventCallbacks<
  T extends Record<string, any> = Record<string, any>
> {
  /** Called when new data is inserted */
  onInsert?: (data: T) => void | Promise<void>;
  /** Called when data is updated */
  onUpdate?: (data: T, oldData: T) => void | Promise<void>;
  /** Called when data is deleted */
  onDelete?: (id: string) => void | Promise<void>;
  /** Called on sync error */
  onError?: (error: Error) => void | Promise<void>;
  /** Called when initial sync is complete (up-to-date) */
  onUpToDate?: () => void | Promise<void>;
}

/**
 * Shape configuration for subscription
 */
export interface ShapeConfig {
  /** Table name to sync */
  table: string;
  /** Shape URL (defaults to runtime config ELECTRIC_URL) */
  shapeUrl?: string;
  /** Primary key column name (default: 'id') */
  primaryKey?: string | string[];
  /** Optional WHERE clause for filtering */
  where?: string;
  /** Shape key for caching/identification (defaults to table name) */
  shapeKey?: string;
  /** Event callbacks for this shape */
  callbacks?: SyncEventCallbacks;
  /** Enable hybrid mode: syncShapeToTable + ShapeStream for UI events */
  hybridMode?: boolean;
}

/**
 * Active subscription metadata
 */
interface ActiveSubscription<
  T extends Record<string, any> = Record<string, any>
> {
  /** syncShapeToTable result (for cleanup) */
  shape?: SyncShapeToTableResult;
  /** ShapeStream instance (for hybrid mode) */
  shapeStream?: ShapeStream;
  /** Shape instance (for hybrid mode) */
  shapeInstance?: Shape;
  /** Unsubscribe function */
  unsubscribe: () => void;
  /** Callbacks for events */
  callbacks: SyncEventCallbacks<T>;
  /** Table name */
  table: string;
  /** Shape key */
  shapeKey: string;
  /** Whether using hybrid mode */
  hybridMode: boolean;
}

// Track active subscriptions - using any for flexibility with generics
const activeSubscriptions = new Map<string, ActiveSubscription<any>>();

// Global sync state
const globalIsSyncing = ref(false);
const globalIsUpToDate = ref(false);
const globalError = ref<Error | null>(null);

/**
 * Composable for syncing data with Electric SQL using syncShapeToTable pattern
 *
 * Supports two modes:
 * 1. **syncShapeToTable mode**: Automatic sync to local PGlite table
 * 2. **Hybrid mode**: syncShapeToTable + ShapeStream for real-time UI events
 *
 * Supports multiple shapes simultaneously - each table can have its own subscription.
 *
 * Usage:
 * ```ts
 * const electric = useElectricSync()
 *
 * // Single shape subscription
 * await electric.subscribe({
 *   table: 'users',
 *   callbacks: {
 *     onInsert: (user) => console.log('New user:', user),
 *     onUpdate: (user, old) => console.log('Updated:', user),
 *     onDelete: (id) => console.log('Deleted:', id),
 *   }
 * })
 *
 * // Hybrid mode (syncShapeToTable + ShapeStream for events)
 * await electric.subscribe({
 *   table: 'users',
 *   hybridMode: true,
 *   callbacks: { onInsert: ... }
 * })
 *
 * // Multiple shapes
 * await electric.subscribe({ table: 'users', shapeKey: 'users-sync' })
 * await electric.subscribe({ table: 'companies', shapeKey: 'companies-sync' })
 *
 * // Later, unsubscribe
 * electric.unsubscribe('users')
 * electric.unsubscribeAll()
 * ```
 */
export function useElectricSync() {
  const config = useRuntimeConfig();
  const ELECTRIC_URL = config.public.electricUrl || "http://localhost:3000";

  /**
   * Subscribe to sync events for a table
   *
   * @param config - Shape configuration object
   * @returns Unsubscribe function
   */
  async function subscribe<T extends Record<string, any> = Record<string, any>>(
    config: ShapeConfig
  ): Promise<() => void> {
    const {
      table,
      shapeUrl,
      primaryKey = ["id"],
      shapeKey = table,
      callbacks = {},
      hybridMode = false,
    } = config;

    // Unsubscribe existing subscription for this shape key
    unsubscribe(shapeKey);

    try {
      globalIsSyncing.value = true;
      globalError.value = null;

      const url = shapeUrl || `${ELECTRIC_URL}/v1/shape`;

      // Get PGlite worker for sync and cast to PGliteWithSync
      const pg = (await getPgWorker()) as unknown as PGliteWithSync;

      let shape: SyncShapeToTableResult | undefined;
      let shapeStream: ShapeStream | undefined;
      let shapeInstance: Shape | undefined;

      if (hybridMode) {
        // HYBRID MODE: syncShapeToTable + ShapeStream for UI events
        
        // 1. Start syncShapeToTable for data sync to local table
        shape = await pg.electric.syncShapeToTable({
          shape: {
            url,
            params: { table },
          },
          table,
          primaryKey: Array.isArray(primaryKey) ? primaryKey : [primaryKey],
          shapeKey,
          onInitialSync: () => {
            globalIsUpToDate.value = true;
            globalIsSyncing.value = false;
            callbacks.onUpToDate?.();
          },
          onError: (error: Error | any) => {
            const err = error instanceof Error ? error : new Error(String(error));
            globalError.value = err;
            globalIsSyncing.value = false;
            callbacks.onError?.(err);
          },
        });

        // 2. Start ShapeStream for real-time UI events
        shapeStream = new ShapeStream({
          url,
          params: { table },
        });

        shapeInstance = new Shape(shapeStream);

        // Subscribe to shape changes for UI events
        const unsubscribeShape = shapeInstance.subscribe(async (messages) => {
          for (const message of messages) {
            try {
              switch (message.headers?.operation) {
                case "insert": {
                  const data = message.value as T;
                  await callbacks.onInsert?.(data);
                  break;
                }
                case "update": {
                  const data = message.value as T;
                  // For update, we'd need the old value which isn't directly available
                  // The callback receives the new value only
                  await callbacks.onUpdate?.(data, data);
                  break;
                }
                case "delete": {
                  // Try to get ID from the message
                  const id = (message.key as string) || 
                             (message.value as any)?.id || 
                             (message.value as any)?.[Array.isArray(primaryKey) ? primaryKey[0] : primaryKey];
                  if (id) {
                    await callbacks.onDelete?.(id);
                  }
                  break;
                }
              }
            } catch (error) {
              console.error(`[useElectricSync] Error in hybrid callback for ${table}:`, error);
              const err = error instanceof Error ? error : new Error(String(error));
              await callbacks.onError?.(err);
            }
          }
        });

        // Create combined unsubscribe function
        const unsubscribeFn = () => {
          unsubscribeShape();
          shape?.unsubscribe();
        };

        // Store subscription
        activeSubscriptions.set(shapeKey, {
          shape,
          shapeStream,
          shapeInstance,
          unsubscribe: unsubscribeFn,
          callbacks,
          table,
          shapeKey,
          hybridMode: true,
        });

        return () => unsubscribe(shapeKey);
      } else {
        // STANDARD MODE: syncShapeToTable only
        shape = await pg.electric.syncShapeToTable({
          shape: {
            url,
            params: { table },
          },
          table,
          primaryKey: Array.isArray(primaryKey) ? primaryKey : [primaryKey],
          shapeKey,
          onInitialSync: () => {
            globalIsUpToDate.value = true;
            globalIsSyncing.value = false;
            callbacks.onUpToDate?.();
          },
          onError: (error: Error | any) => {
            const err = error instanceof Error ? error : new Error(String(error));
            globalError.value = err;
            globalIsSyncing.value = false;
            callbacks.onError?.(err);
          },
        });

        // Create unsubscribe function
        const unsubscribeFn = () => {
          shape?.unsubscribe();
        };

        // Store subscription
        activeSubscriptions.set(shapeKey, {
          shape,
          unsubscribe: unsubscribeFn,
          callbacks,
          table,
          shapeKey,
          hybridMode: false,
        });

        return () => unsubscribe(shapeKey);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      globalError.value = err;
      globalIsSyncing.value = false;
      callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Subscribe to multiple shapes simultaneously
   *
   * @param configs - Array of shape configurations
   * @returns Unsubscribe function that unsubscribes all shapes
   */
  async function subscribeMany(
    configs: ShapeConfig[]
  ): Promise<() => void> {
    const unsubscribeFns: (() => void)[] = [];

    for (const config of configs) {
      try {
        const unsubscribe = await subscribe(config);
        unsubscribeFns.push(unsubscribe);
      } catch (error) {
        console.error(`[useElectricSync] Failed to subscribe to ${config.table}:`, error);
        // Continue with other subscriptions even if one fails
      }
    }

    // Return combined unsubscribe function
    return () => {
      unsubscribeFns.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    };
  }

  /**
   * Unsubscribe from sync events for a shape
   *
   * @param shapeKey - Shape key to unsubscribe (or table name if no custom key)
   */
  function unsubscribe(shapeKey: string): void {
    const subscription = activeSubscriptions.get(shapeKey);
    if (subscription) {
      try {
        subscription.unsubscribe();
      } catch (e) {
        // Ignore cleanup errors
      }
      activeSubscriptions.delete(shapeKey);
    }

    // Reset state if no more subscriptions
    if (activeSubscriptions.size === 0) {
      globalIsSyncing.value = false;
      globalIsUpToDate.value = false;
    }
  }

  /**
   * Unsubscribe from all active syncs
   */
  function unsubscribeAll(): void {
    for (const shapeKey of Array.from(activeSubscriptions.keys())) {
      unsubscribe(shapeKey);
    }
  }

  /**
   * Check if a shape has an active subscription
   */
  function hasSubscription(shapeKey: string): boolean {
    return activeSubscriptions.has(shapeKey);
  }

  /**
   * Get list of subscribed shape keys
   */
  function getSubscribedShapes(): string[] {
    return Array.from(activeSubscriptions.keys());
  }

  /**
   * Get list of subscribed tables
   */
  function getSubscribedTables(): string[] {
    return Array.from(activeSubscriptions.values()).map((sub) => sub.table);
  }

  /**
   * Check if a table is being synced (any subscription for this table)
   */
  function isTableSubscribed(table: string): boolean {
    for (const sub of activeSubscriptions.values()) {
      if (sub.table === table) return true;
    }
    return false;
  }

  return {
    // Reactive state (readonly)
    isSyncing: readonly(globalIsSyncing),
    isUpToDate: readonly(globalIsUpToDate),
    error: readonly(globalError),

    // Methods
    subscribe,
    subscribeMany,
    unsubscribe,
    unsubscribeAll,
    hasSubscription,
    getSubscribedShapes,
    getSubscribedTables,
    isTableSubscribed,
  };
}

export default useElectricSync;
