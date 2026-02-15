import { live } from "@electric-sql/pglite/live";
import { electricSync } from "@electric-sql/pglite-sync";
import { PGliteWorker } from "@electric-sql/pglite/worker";

/**
 * Table schema definitions for PGlite client database
 * These mirror the server database schema for synced tables
 */
export const TABLE_SCHEMAS: Record<string, string> = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      avatar_url TEXT,
      preferences JSONB DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT,
      is_active BOOLEAN DEFAULT true
    )
  `,
  companies: `
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      settings JSONB DEFAULT '{"timezone":"UTC","dateFormat":"YYYY-MM-DD","defaultLanguage":"en","theme":{}}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `,
  company_members: `
    CREATE TABLE IF NOT EXISTS company_members (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL,
      invited_by TEXT,
      UNIQUE(company_id, user_id)
    )
  `,
  user_groups: `
    CREATE TABLE IF NOT EXISTS user_groups (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  user_group_members: `
    CREATE TABLE IF NOT EXISTS user_group_members (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      added_by TEXT NOT NULL,
      added_at TEXT NOT NULL,
      UNIQUE(group_id, user_id)
    )
  `,
  workspaces: `
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      menu JSONB DEFAULT '[]',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `,
  folders: `
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      settings JSONB DEFAULT '{}',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `,
};

/**
 * Tables to auto-create on worker initialization
 */
const AUTO_CREATE_TABLES = [
  'users',
  'companies', 
  'company_members',
  'user_groups',
  'user_group_members',
  'workspaces',
  'folders'
];

/**
 * Singleton PGlite instance
 * Shared across all composables
 */
let pgInstance: PGliteWorker | null = null;
let initPromise: Promise<PGliteWorker> | null = null;

/**
 * Check if a table exists in PGlite
 */
async function tableExists(pg: PGliteWorker, tableName: string): Promise<boolean> {
  const result = await pg.query(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=$1`,
    [tableName]
  );
  return result.rows.length > 0;
}

/**
 * Initialize all required tables
 */
async function initializeTables(pg: PGliteWorker): Promise<void> {
  console.log('[usePgWorker] Checking/creating tables...');
  
  for (const tableName of AUTO_CREATE_TABLES) {
    const exists = await tableExists(pg, tableName);
    if (!exists) {
      const schema = TABLE_SCHEMAS[tableName];
      if (schema) {
        await pg.exec(schema);
        console.log(`[usePgWorker] Created table: ${tableName}`);
      }
    } else {
      console.log(`[usePgWorker] Table exists: ${tableName}`);
    }
  }
  
  console.log('[usePgWorker] Table initialization complete');
}

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
  
  // Initialize tables after worker is ready
  await initializeTables(worker);
  
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
   */
  async function liveQuery<T = any>(
    sql: string,
    params?: any[]
  ): Promise<{
    subscribe: (callback: (data: T[]) => void) => (() => void);
    initialData: T[];
  }> {
    const worker = await init();
    
    const liveExtension = (worker as any).live;
    if (!liveExtension) {
      throw new Error("Live extension not available");
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
