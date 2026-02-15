import { ShapeStream } from "@electric-sql/client";
import type { Message, Row } from "@electric-sql/client";
import { getPgWorker } from "./usePgWorker";

/**
 * Electric SQL Sync Event Callbacks
 */
export interface SyncEventCallbacks<T extends Record<string, any> = Record<string, any>> {
  /** Called when new data is inserted */
  onInsert?: (data: T) => void;
  /** Called when data is updated */
  onUpdate?: (data: T, oldData: T) => void;
  /** Called when data is deleted */
  onDelete?: (id: string) => void;
  /** Called on sync error */
  onError?: (error: Error) => void;
  /** Called when initial sync is complete (up-to-date) */
  onUpToDate?: () => void;
}

/**
 * Shape configuration for subscription
 */
export interface ShapeConfig {
  /** Table name to sync */
  table: string;
  /** Primary key column name (default: 'id') */
  primaryKey?: string;
  /** Optional WHERE clause for filtering */
  where?: string;
  /** Shape key for caching/identification */
  shapeKey?: string;
}

/**
 * Active subscription metadata
 */
interface ActiveSubscription<T extends Record<string, any> = Record<string, any>> {
  stream: ShapeStream;
  unsubscribe: () => void;
  callbacks: SyncEventCallbacks<T>;
  table: string;
}

// Track active subscriptions - using any for flexibility with generics
const activeSubscriptions = new Map<string, ActiveSubscription<any>>();

// Global sync state
const globalIsSyncing = ref(false);
const globalIsUpToDate = ref(false);
const globalError = ref<Error | null>(null);

/**
 * Composable for syncing data with Electric SQL using ShapeStream pattern
 * 
 * This follows the pattern where:
 * - ShapeStream handles sync events (inserts, updates, deletes)
 * - Pages query data themselves using usePgWorker
 * - Returns subscribe/unsubscribe controls, not data
 * 
 * Usage:
 * ```ts
 * const electric = useElectricSync()
 * 
 * // Subscribe to sync events for a table
 * await electric.subscribe('users', 'http://localhost:3000/v1/shape', {
 *   onInsert: (user) => console.log('New user:', user),
 *   onUpdate: (user, old) => console.log('Updated:', user),
 *   onDelete: (id) => console.log('Deleted:', id),
 * })
 * 
 * // Later, unsubscribe
 * electric.unsubscribe('users')
 * ```
 */
export function useElectricSync() {
  const config = useRuntimeConfig();
  const ELECTRIC_URL = config.public.electricUrl || "http://localhost:3000";

  /**
   * Subscribe to sync events for a table
   * 
   * @param table - Table name to sync
   * @param shapeUrl - Optional custom shape URL (defaults to ELECTRIC_URL)
   * @param callbacks - Event callbacks for insert/update/delete/error
   * @returns Unsubscribe function
   */
  async function subscribe<T extends Record<string, any> = Record<string, any>>(
    table: string,
    shapeUrl?: string,
    callbacks: SyncEventCallbacks<T> = {}
  ): Promise<() => void> {
    // Unsubscribe existing subscription for this table
    unsubscribe(table);

    try {
      globalIsSyncing.value = true;
      globalError.value = null;

      const url = shapeUrl || `${ELECTRIC_URL}/v1/shape`;

      // Create ShapeStream
      const stream = new ShapeStream({
        url,
        params: { table },
        subscribe: true,
      });

      // Track current data for detecting updates vs inserts
      const currentData = new Map<string, T>();

      // Subscribe to stream
      const unsubscribeFn = stream.subscribe(
        (messages: Message[]) => {
          for (const message of messages) {
            // Handle control messages
            if ('headers' in message) {
              const headers = message.headers as Record<string, any>;
              
              // Check for up-to-date control message
              if (headers.control === 'up-to-date') {
                globalIsUpToDate.value = true;
                globalIsSyncing.value = false;
                callbacks.onUpToDate?.();
                continue;
              }
              
              // Skip other control messages (snapshot-end, subset-end, etc.)
              if ('control' in headers) {
                continue;
              }
              
              // Handle event messages (move-out)
              if ('event' in headers) {
                continue;
              }
              
              // Handle change messages
              if ('operation' in headers) {
                const changeMsg = message as {
                  key: string;
                  value: T;
                  old_value?: Partial<T>;
                  headers: { operation: string; [key: string]: any };
                };
                const key = changeMsg.key;
                const value = changeMsg.value;

                switch (headers.operation) {
                  case 'insert': {
                    currentData.set(key, value);
                    callbacks.onInsert?.(value);
                    break;
                  }
                  case 'update': {
                    const oldValue = currentData.get(key);
                    currentData.set(key, value);
                    callbacks.onUpdate?.(value, oldValue as T);
                    break;
                  }
                  case 'delete': {
                    currentData.delete(key);
                    callbacks.onDelete?.(key);
                    break;
                  }
                }
              }
            }
          }
        },
        (error: Error) => {
          globalError.value = error;
          globalIsSyncing.value = false;
          callbacks.onError?.(error);
        }
      );

      // Store subscription
      activeSubscriptions.set(table, {
        stream,
        unsubscribe: unsubscribeFn,
        callbacks,
        table,
      });

      return () => unsubscribe(table);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      globalError.value = err;
      globalIsSyncing.value = false;
      callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Unsubscribe from sync events for a table
   * 
   * @param table - Table name to unsubscribe
   */
  function unsubscribe(table: string): void {
    const subscription = activeSubscriptions.get(table);
    if (subscription) {
      try {
        subscription.unsubscribe();
        subscription.stream.unsubscribeAll();
      } catch (e) {
        // Ignore cleanup errors
      }
      activeSubscriptions.delete(table);
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
    for (const table of Array.from(activeSubscriptions.keys())) {
      unsubscribe(table);
    }
  }

  /**
   * Check if a table has an active subscription
   */
  function hasSubscription(table: string): boolean {
    return activeSubscriptions.has(table);
  }

  /**
   * Get list of subscribed tables
   */
  function getSubscribedTables(): string[] {
    return Array.from(activeSubscriptions.keys());
  }

  return {
    // Reactive state (readonly)
    isSyncing: readonly(globalIsSyncing),
    isUpToDate: readonly(globalIsUpToDate),
    error: readonly(globalError),

    // Methods
    subscribe,
    unsubscribe,
    unsubscribeAll,
    hasSubscription,
    getSubscribedTables,
  };
}

export default useElectricSync;
