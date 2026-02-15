import { live } from "@electric-sql/pglite/live";
import { electricSync } from "@electric-sql/pglite-sync";
import { PGliteWorker } from "@electric-sql/pglite/worker";

/**
 * Singleton PGlite instance
 * Shared across all composables
 */
let pgInstance: PGliteWorker | null = null;
let initPromise: Promise<PGliteWorker> | null = null;

/**
 * Get or create PGlite Worker instance
 * Returns singleton to avoid multiple connections
 */
export async function getPgWorker(): Promise<PGliteWorker> {
  // Return existing instance
  if (pgInstance) {
    return pgInstance;
  }

  // Return existing init promise (prevents duplicate initialization)
  if (initPromise) {
    return initPromise;
  }

  // Create new instance
  initPromise = createPgWorker();

  try {
    pgInstance = await initPromise;
    return pgInstance;
  } catch (error) {
    // Reset on error so next call can retry
    initPromise = null;
    throw error;
  }
}

async function createPgWorker(): Promise<PGliteWorker> {
  console.log("[usePgWorker] Creating PGlite Worker...");

  const worker = new PGliteWorker(
    new Worker("/worker/pglite.worker.js", {
      type: "module",
    }),
    {
      extensions: {
        live,
        sync: electricSync(),
      },
    }
  );

  await worker.waitReady;
  console.log("[usePgWorker] PGlite Worker ready");

  return worker;
}

/**
 * Reset PGlite instance (useful for logout/testing)
 */
export function resetPgWorker(): void {
  pgInstance = null;
  initPromise = null;
  console.log("[usePgWorker] Instance reset");
}

/**
 * Query result type
 */
export interface QueryResult<T = any> {
  rows: T[];
  affectedRows?: number;
}

/**
 * Composable wrapper for convenience
 * Provides typed query methods and reactive state
 */
export function usePgWorker() {
  const isReady = useState("pg-worker-ready", () => false);
  const isLoading = useState("pg-worker-loading", () => false);
  const error = useState<Error | null>("pg-worker-error", () => null);

  /**
   * Initialize PGlite Worker
   */
  async function init(): Promise<PGliteWorker> {
    if (isReady.value && pgInstance) return pgInstance;

    isLoading.value = true;
    error.value = null;

    try {
      const pg = await getPgWorker();
      isReady.value = true;
      return pg;
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Execute a SQL query
   */
  async function query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const worker = await init();
    const result = await worker.query<T>(sql, params);
    return {
      rows: result.rows || [],
      affectedRows: result.affectedRows,
    };
  }

  /**
   * Execute a SQL command (for DDL/INSERT/UPDATE/DELETE)
   */
  async function exec(sql: string): Promise<void> {
    const worker = await init();
    await worker.exec(sql);
  }

  /**
   * Get a single row by query
   */
  async function queryOne<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T | null> {
    const result = await query<T>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Create a live query that updates automatically
   * Returns an observable that pages can subscribe to
   * 
   * Note: This uses the live extension from @electric-sql/pglite/live
   */
  async function liveQuery<T = any>(
    sql: string,
    params?: any[]
  ): Promise<{
    subscribe: (callback: (data: T[]) => void) => (() => void);
    initialData: T[];
  }> {
    const worker = await init();
    
    // Access live through the extensions
    const liveExtension = (worker as any).live;
    if (!liveExtension) {
      throw new Error("Live extension not available. Make sure the worker is configured with the live extension.");
    }
    
    const liveResult = await liveExtension.query(sql, params);

    return {
      subscribe: (callback: (data: T[]) => void): (() => void) => {
        const unsubscribe = liveResult.subscribe((result: { rows: T[] }) => {
          callback(result.rows);
        });
        return unsubscribe;
      },
      initialData: liveResult.rows,
    };
  }

  /**
   * Reset PGlite instance
   */
  function reset(): void {
    resetPgWorker();
    isReady.value = false;
    isLoading.value = false;
    error.value = null;
  }

  /**
   * Get raw PGlite instance (for advanced use cases)
   */
  async function getInstance(): Promise<PGliteWorker> {
    return await init();
  }

  return {
    // State (readonly)
    isReady: readonly(isReady),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Methods
    init,
    query,
    queryOne,
    exec,
    liveQuery,
    reset,
    getInstance,

    // Raw instance getter
    get instance() {
      return pgInstance;
    },
  };
}

export default usePgWorker;
