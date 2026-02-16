import type {
  SyncShapeToTableResult,
  PGliteWithSync,
} from "@electric-sql/pglite-sync";
import { ShapeStream, Shape, type ShapeMessage } from "@electric-sql/client";
import { getPgWorker } from "./usePgWorker";

/**
 * Electric SQL Sync Event Callbacks
 */
export interface SyncEventCallbacks<
  T extends Record<string, any> = Record<string, any>,
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
  /** Table name to sync - also used as shapeKey */
  table: string;
  /** Shape URL (defaults to runtime config ELECTRIC_URL) */
  shapeUrl?: string;
  /** Primary key column name (default: 'id') */
  primaryKey?: string | string[];
  /** Event callbacks for this shape */
  callbacks?: SyncEventCallbacks;
}

/**
 * Component-level callback registration
 */
interface CallbackRegistration<
  T extends Record<string, any> = Record<string, any>,
> {
  /** Unique ID for this callback registration */
  id: string;
  /** Callbacks */
  callbacks: SyncEventCallbacks<T>;
}

/**
 * Shared shape instance - one per table, shared across all components
 */
interface SharedShapeInstance {
  /** syncShapeToTable result (for cleanup) */
  shape: SyncShapeToTableResult;
  /** ShapeStream for real-time events */
  shapeStream: ShapeStream;
  /** Table name (also used as shapeKey) */
  table: string;
  /** Primary key columns (for extracting ID from delete messages) */
  primaryKey: string[];
  /** Registered component callbacks */
  callbacks: Map<string, CallbackRegistration>;
  /** Whether initial sync is complete */
  isUpToDate: boolean;
  /** Unsubscribe function from ShapeStream */
  shapeUnsubscribe?: () => void;
}

// Global state keys for Nuxt useState
const SHARED_SHAPES_KEY = "electric-sync-shared-shapes";
const INFLIGHT_PROMISES_KEY = "electric-sync-inflight-promises";
const GLOBAL_SYNC_STATE_KEY = "electric-sync-global-state";

/**
 * Get shared shapes Map - uses window object for true global singleton
 * This survives HMR and works across all component instances
 */
function getSharedShapes(): Map<string, SharedShapeInstance> {
  if (typeof window === "undefined") {
    // SSR - return empty map (sync only works on client)
    return new Map();
  }
  if (!(window as any).__electricSharedShapes) {
    (window as any).__electricSharedShapes = new Map<string, SharedShapeInstance>();
  }
  return (window as any).__electricSharedShapes;
}

/**
 * Get in-flight promises Map - uses window object for true global singleton
 */
function getInflightPromises(): Map<string, Promise<SharedShapeInstance>> {
  if (typeof window === "undefined") {
    return new Map();
  }
  if (!(window as any).__electricInflightPromises) {
    (window as any).__electricInflightPromises = new Map<string, Promise<SharedShapeInstance>>();
  }
  return (window as any).__electricInflightPromises;
}

// Global sync state - use useState for SSR compatibility
const globalIsSyncing = useState("electric-sync-is-syncing", () => false);
const globalError = useState<Error | null>("electric-sync-error", () => null);

// Generate unique callback ID
function generateCallbackId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Dispatch event to all registered callbacks for a shape
 */
async function dispatchEvent<T extends Record<string, any>>(
  shapeKey: string,
  eventType: "insert" | "update" | "delete" | "upToDate" | "error",
  data?: T,
  extra?: any,
) {
  const sharedShape = getSharedShapes().get(shapeKey);
  if (!sharedShape) return;

  for (const registration of sharedShape.callbacks.values()) {
    try {
      const { callbacks } = registration;
      switch (eventType) {
        case "insert":
          await callbacks.onInsert?.(data as T);
          break;
        case "update":
          await callbacks.onUpdate?.(data as T, extra as T);
          break;
        case "delete":
          await callbacks.onDelete?.(extra as string);
          break;
        case "upToDate":
          await callbacks.onUpToDate?.();
          break;
        case "error":
          await callbacks.onError?.(extra as Error);
          break;
      }
    } catch (error) {
      console.error(
        `[useElectricSync] Error in callback for ${shapeKey}:`,
        error,
      );
    }
  }
}

/**
 * Create a shared shape instance (if not exists) or return existing one
 * Uses in-flight promise to prevent race conditions when multiple components subscribe simultaneously
 */
async function getOrCreateSharedShape(
  table: string,
  shapeKey: string,
  shapeUrl: string,
  primaryKey: string[],
): Promise<SharedShapeInstance> {
  // Return existing shared shape if already created
  const existing = getSharedShapes().get(shapeKey);
  if (existing) {
    return existing;
  }

  // Check if there's already an in-flight creation promise for this shapeKey
  const inflight = getInflightPromises().get(shapeKey);
  if (inflight) {
    // Wait for the existing creation to complete
    return await inflight;
  }

  // Create new shared shape - wrap in a promise and track it
  const creationPromise = createSharedShape(
    table,
    shapeKey,
    shapeUrl,
    primaryKey,
  );
  getInflightPromises().set(shapeKey, creationPromise);

  try {
    const sharedShape = await creationPromise;
    return sharedShape;
  } finally {
    // Clean up in-flight promise regardless of success or failure
    getInflightPromises().delete(shapeKey);
  }
}

/**
 * Actually create the shared shape instance (internal implementation)
 */
async function createSharedShape(
  table: string,
  shapeKey: string,
  shapeUrl: string,
  primaryKey: string[],
): Promise<SharedShapeInstance> {
  // Double-check if shape was created while we were waiting
  const existing = getSharedShapes().get(shapeKey);
  if (existing) {
    return existing;
  }

  // Create new shared shape
  const pg = (await getPgWorker()) as unknown as PGliteWithSync;

  // 1. Start syncShapeToTable for data persistence to local PGlite
  const shape = await pg.electric.syncShapeToTable({
    shape: {
      url: shapeUrl,
      params: { table },
    },
    table,
    primaryKey,
    shapeKey,
    onInitialSync: () => {
      const sharedShape = getSharedShapes().get(shapeKey);
      if (sharedShape) {
        sharedShape.isUpToDate = true;
        globalIsSyncing.value = false;
        dispatchEvent(shapeKey, "upToDate");
      }
    },
    onError: (error: Error | any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[useElectricSync] syncShapeToTable error for ${shapeKey}:`,
        err,
      );
      globalError.value = err;
      globalIsSyncing.value = false;
      dispatchEvent(shapeKey, "error", undefined, err);
    },
  });

  // 2. Start ShapeStream for real-time events
  const shapeStream = new ShapeStream({
    url: shapeUrl,
    params: { table },
  });

  // 3. Create shared instance (simplified - removed shapeInstance)
  const sharedShape: SharedShapeInstance = {
    shape,
    shapeStream,
    table,
    primaryKey,
    callbacks: new Map(),
    isUpToDate: false,
  };

  // 4. Subscribe to shape changes and dispatch to all registered callbacks
  // Use shapeStream.subscribe() directly for raw messages
  const shapeUnsubscribe = shapeStream.subscribe(async (messages) => {
    // Handle both single message and array of messages
    const messageArray = Array.isArray(messages) ? messages : [messages];
    
    for (const message of messageArray) {
      // Skip if message is not valid
      if (!message || typeof message !== 'object') {
        console.warn('[useElectricSync] Invalid message received:', message);
        continue;
      }
      
      const operation = message.headers?.operation;
      
      switch (operation) {
        case "insert": {
          const data = message.value as Record<string, any>;
          await dispatchEvent(shapeKey, 'insert', data);
          break;
        }
        case "update": {
          const data = message.value as Record<string, any>;
          await dispatchEvent(shapeKey, 'update', data, data);
          break;
        }
        case "delete": {
          const id = (message.key as string) ||
                     (message.value as any)?.id ||
                     (message.value as any)?.[primaryKey[0]];
          if (id) {
            await dispatchEvent(shapeKey, 'delete', undefined, id);
          }
          break;
        }
      }
    }
  });

  sharedShape.shapeUnsubscribe = shapeUnsubscribe;
  getSharedShapes().set(shapeKey, sharedShape);

  return sharedShape;
}

/**
 * Cleanup shared shape if no more callbacks registered
 */
function maybeCleanupShape(shapeKey: string): void {
  const sharedShape = getSharedShapes().get(shapeKey);
  if (!sharedShape) return;

  // If no more callbacks, unsubscribe and remove
  if (sharedShape.callbacks.size === 0) {
    try {
      sharedShape.shapeUnsubscribe?.();
      sharedShape.shape.unsubscribe();
    } catch (e) {
      // Ignore cleanup errors
    }
    getSharedShapes().delete(shapeKey);
  }

  // Reset global state if no more shapes
  if (getSharedShapes().size === 0) {
    globalIsSyncing.value = false;
  }
}

/**
 * Composable for syncing data with Electric SQL
 *
 * Multiple components can subscribe to the same shape simultaneously.
 * Each component receives its own callbacks while sharing the underlying
 * ShapeStream and syncShapeToTable instance.
 *
 * Usage:
 * ```ts
 * // Component A
 * const electric = useElectricSync()
 * const unsubscribeA = await electric.subscribe({
 *   table: 'users',
 *   callbacks: { onInsert: (user) => console.log('A:', user) }
 * })
 *
 * // Component B (same shape, shares the underlying subscription)
 * const unsubscribeB = await electric.subscribe({
 *   table: 'users',
 *   callbacks: { onInsert: (user) => console.log('B:', user) }
 * })
 * // Both A and B receive the same events
 *
 * // Later, each component cleans up independently
 * unsubscribeA() // Component A stops receiving events
 * unsubscribeB() // When last component unsubscribes, shape is cleaned up
 * ```
 */
export function useElectricSync() {
  const config = useRuntimeConfig();
  const ELECTRIC_URL = config.public.electricUrl || "http://localhost:3000";

  /**
   * Subscribe to sync events for a table
   *
   * Multiple components can subscribe to the same table.
   * The underlying ShapeStream is shared, but each component
   * gets its own callbacks.
   *
   * @param config - Shape configuration object
   * @returns Unsubscribe function
   */
  async function subscribe<T extends Record<string, any> = Record<string, any>>(
    config: ShapeConfig,
  ): Promise<() => void> {
    const {
      table,
      shapeUrl,
      primaryKey = ["id"],
      callbacks = {},
    } = config;

    // Use table as shapeKey - one shape per table
    const shapeKey = table;

    try {
      globalIsSyncing.value = true;
      globalError.value = null;

      const url = shapeUrl || `${ELECTRIC_URL}/v1/shape`;
      const pkArray = Array.isArray(primaryKey) ? primaryKey : [primaryKey];

      // Get or create shared shape instance
      const sharedShape = await getOrCreateSharedShape(
        table,
        shapeKey,
        url,
        pkArray,
      );

      // Generate unique callback ID for this component
      const callbackId = generateCallbackId();

      // Register this component's callbacks
      const registration: CallbackRegistration<T> = {
        id: callbackId,
        callbacks,
      };
      sharedShape.callbacks.set(callbackId, registration);

      // If already up-to-date, immediately call onUpToDate for this component
      if (sharedShape.isUpToDate && callbacks.onUpToDate) {
        try {
          await callbacks.onUpToDate();
        } catch (error) {
          console.error(
            `[useElectricSync] Error in onUpToDate callback:`,
            error,
          );
        }
      }

      // Return unsubscribe function for this specific registration
      return () => {
        sharedShape.callbacks.delete(callbackId);
        maybeCleanupShape(shapeKey);
      };
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
  async function subscribeMany(configs: ShapeConfig[]): Promise<() => void> {
    const unsubscribeFns: (() => void)[] = [];

    for (const config of configs) {
      try {
        const unsubscribe = await subscribe(config);
        unsubscribeFns.push(unsubscribe);
      } catch (error) {
        console.error(
          `[useElectricSync] Failed to subscribe to ${config.table}:`,
          error,
        );
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
   * Note: This removes ALL callbacks for the shape.
   * Individual component cleanup should use the function returned by subscribe().
   *
   * @param shapeKey - Shape key to unsubscribe (or table name if no custom key)
   */
  function unsubscribe(shapeKey: string): void {
    const sharedShape = getSharedShapes().get(shapeKey);
    if (sharedShape) {
      // Clear all callbacks
      sharedShape.callbacks.clear();
      maybeCleanupShape(shapeKey);
    }
  }

  /**
   * Unsubscribe from all active syncs
   */
  function unsubscribeAll(): void {
    for (const shapeKey of Array.from(getSharedShapes().keys())) {
      unsubscribe(shapeKey);
    }
  }

  /**
   * Check if a shape has any active subscriptions
   */
  function hasSubscription(shapeKey: string): boolean {
    const sharedShape = getSharedShapes().get(shapeKey);
    return sharedShape ? sharedShape.callbacks.size > 0 : false;
  }

  /**
   * Get count of active component subscriptions for a shape
   */
  function getSubscriberCount(shapeKey: string): number {
    const sharedShape = getSharedShapes().get(shapeKey);
    return sharedShape ? sharedShape.callbacks.size : 0;
  }

  /**
   * Get list of subscribed shape keys
   */
  function getSubscribedShapes(): string[] {
    return Array.from(getSharedShapes().keys());
  }

  /**
   * Get list of subscribed tables
   */
  function getSubscribedTables(): string[] {
    return Array.from(getSharedShapes().values()).map((s) => s.table);
  }

  /**
   * Check if a table is being synced (any subscription for this table)
   */
  function isTableSubscribed(table: string): boolean {
    for (const sharedShape of getSharedShapes().values()) {
      if (sharedShape.table === table) return true;
    }
    return false;
  }

  /**
   * Check if a specific shape is up-to-date (initial sync complete)
   */
  function isShapeUpToDate(shapeKey: string): boolean {
    return getSharedShapes().get(shapeKey)?.isUpToDate ?? false;
  }

  return {
    // Reactive state (readonly)
    isSyncing: readonly(globalIsSyncing),
    error: readonly(globalError),

    // Methods
    subscribe,
    subscribeMany,
    unsubscribe,
    unsubscribeAll,
    hasSubscription,
    getSubscriberCount,
    getSubscribedShapes,
    getSubscribedTables,
    isTableSubscribed,
    isShapeUpToDate,
  };
}

export default useElectricSync;
