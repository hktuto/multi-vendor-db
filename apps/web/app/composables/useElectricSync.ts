import type { PGliteInterface } from "@electric-sql/pglite";
import type {
  SyncShapeToTableResult,
  PGliteWithSync,
} from "@electric-sql/pglite-sync";
import { PGlite } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { electricSync } from "@electric-sql/pglite-sync";
import { PGliteWorker } from '@electric-sql/pglite/worker'
/**
 * Core Electric SQL sync composable
 * Manages PGlite database and sync lifecycle
 *
 * TODO: Bundle PGlite worker for production - use esbuild to create static bundle
 */
let dbInstane: any;
export function useElectricSync() {
  const db = useState<PGliteInterface | null>("electric-db", () => null);
  const isConnected = useState("electric-connected", () => false);
  const isSyncing = useState("electric-syncing", () => false);
  const lastError = useState<Error | null>("electric-error", () => null);
  const activeShapes = useState<Map<string, SyncShapeToTableResult>>(
    "electric-shapes",
    () => new Map(),
  );


  async function setupPgLiteWorker() {
    console.log("setupPgLiteWorker")
    dbInstane = new PGliteWorker(
      new Worker(
        "/worker/pglite.worker.js", {
        type: 'module',
      }),
        {
          extensions: {
          live,
          sync: electricSync(),
          }
        }
    )
    console.log(dbInstane)
    await dbInstane.waitReady;
  }

  async function initializeDatabase() {
    if (dbInstane) {
      return dbInstane;
    }
    try {
      await setupPgLiteWorker();
      isSyncing.value = true;
      lastError.value = null;
      isConnected.value = true;
      return dbInstane;
    } catch (error) {
      lastError.value = error as Error;
      console.error("Failed to initialize Electric:", error);
      throw error;
    }
  }

  /**
   * Sync a shape to a local table
   */
  async function syncShape(
    shapeKey: string,
    tableName: string,
    shapeUrl: string,
    options: {
      primaryKey?: string[];
      where?: string;
    } = {},
  ): Promise<SyncShapeToTableResult> {
    const database = await initializeDatabase();

    // Stop existing sync for this shape if any
    await unsyncShape(shapeKey);

    try {
      isSyncing.value = true;

      // Access sync via the sync namespace on PGlite
      const pgWithSync = database as PGliteWithSync;
      if (!pgWithSync.sync) {
        throw new Error(
          "PGlite sync plugin not loaded. Check plugin initialization.",
        );
      }

      const shape = await pgWithSync.sync.syncShapeToTable({
        shape: {
          url: shapeUrl,
          params: {
                table: tableName,
              },
        },
        table: tableName,
        primaryKey: options.primaryKey || ["id"],
        shapeKey: shapeKey,
      });

      activeShapes.value.set(shapeKey, shape);

      console.log(`Shape ${shapeKey} synced, isUpToDate:`, shape.isUpToDate);

      return shape;
    } catch (error) {
      lastError.value = error as Error;
      throw error;
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Stop syncing a specific shape
   */
  async function unsyncShape(shapeKey: string) {
    const shape = activeShapes.value.get(shapeKey);
    if (shape) {
      await shape.unsubscribe();
      activeShapes.value.delete(shapeKey);
      console.log(`Unsynced shape: ${shapeKey}`);
    }
  }

  /**
   * Stop all active syncs
   */
  async function unsyncAllShapes() {
    const promises = Array.from(activeShapes.value.keys()).map((key) =>
      unsyncShape(key),
    );
    await Promise.all(promises);
    activeShapes.value.clear();
  }

  /**
   * Execute a query with error handling
   */
  async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const database = await initializeDatabase();
    const result = await database!.query(sql, params);
    console.log("result",result)
    return result.rows as T[];
  }

  /**
   * Execute a single row query
   */
  async function queryOne<T = any>(
    sql: string,
    params?: any[],
  ): Promise<T | null> {
    const results = await query<T>(sql, params);
    return results[0] || null;
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   */
  async function exec(sql: string, params?: any[]): Promise<void> {
    const database = await initializeDatabase();
    await database!.query(sql, params);
  }

  return {
    // State
    db: readonly(db),
    isConnected: readonly(isConnected),
    isSyncing: readonly(isSyncing),
    lastError: readonly(lastError),

    // Methods
    initializeDatabase,
    syncShape,
    unsyncShape,
    unsyncAllShapes,
    query,
    queryOne,
    exec,
  };
}
