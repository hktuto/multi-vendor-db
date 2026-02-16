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
      plan TEXT NOT NULL DEFAULT 'basic',
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
  invite_links: `
    CREATE TABLE IF NOT EXISTS invite_links (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      email TEXT,
      token TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      used_at TEXT,
      used_by TEXT,
      is_active BOOLEAN DEFAULT true
    )
  `,
};

/**
 * Tables to auto-create on worker initialization
 */
const AUTO_CREATE_TABLES = [
  "users",
  "companies",
  "company_members",
  "user_groups",
  "user_group_members",
  "workspaces",
  "folders",
  "invite_links"
];];

/**
 * Singleton PGlite instance
 * Shared across all composables
 */
let pgInstance: PGliteWorker | null = null;
let initPromise: Promise<PGliteWorker> | null = null;

/**
 * Check if a table exists in PGlite (PostgreSQL-compatible)
 */
async function tableExists(
  pg: PGliteWorker,
  tableName: string,
): Promise<boolean> {
  const result = await pg.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    )`,
    [tableName],
  );
  return result.rows[0]?.exists === true;
}

/**
 * Check if a column exists in a table
 */
async function columnExists(
  pg: PGliteWorker,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const result = await pg.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    )`,
    [tableName, columnName],
  );
  return result.rows[0]?.exists === true;
}

/**
 * Migration: Add missing columns to existing tables
 */
async function migrateTableColumns(pg: PGliteWorker): Promise<void> {
  console.log("[usePgWorker] Checking for missing columns...");

  // Check and add is_active to users table
  const hasIsActive = await columnExists(pg, "users", "is_active");
  if (!hasIsActive) {
    await pg.exec(
      `ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true`,
    );
    console.log("[usePgWorker] Added column: users.is_active");
  }

  // Add more migrations here as needed
}

/**
 * Check which tables exist - batch query for efficiency
 */
async function batchCheckTablesExist(pg: PGliteWorker): Promise<Set<string>> {
  const result = await pg.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
     AND table_name = ANY($1)`,
    [AUTO_CREATE_TABLES],
  );
  return new Set(result.rows.map((r) => r.table_name));
}

/**
 * Initialize all required tables - batch creation for efficiency
 */
async function initializeTables(pg: PGliteWorker): Promise<void> {
  console.log("[usePgWorker] Checking/creating tables (batch mode)...");

  // Step 1: Batch check which tables exist
  const existingTables = await batchCheckTablesExist(pg);
  console.log(
    `[usePgWorker] Existing tables: ${Array.from(existingTables).join(", ") || "none"}`,
  );

  // Step 2: Collect all schemas that need to be created
  const missingSchemas: string[] = [];
  const tablesToCreate: string[] = [];

  for (const tableName of AUTO_CREATE_TABLES) {
    if (!existingTables.has(tableName)) {
      const schema = TABLE_SCHEMAS[tableName];
      if (schema) {
        missingSchemas.push(schema.trim());
        tablesToCreate.push(tableName);
      }
    }
  }

  // Step 3: Batch create all missing tables in a single exec
  if (missingSchemas.length > 0) {
    const batchSql = missingSchemas.join(";\n");
    console.log(
      `[usePgWorker] Creating ${tablesToCreate.length} tables in batch: ${tablesToCreate.join(", ")}`,
    );
    await pg.exec(batchSql);
    console.log(`[usePgWorker] Batch created: ${tablesToCreate.join(", ")}`);
  } else {
    console.log("[usePgWorker] All tables already exist");
  }

  // Step 4: Run migrations for schema updates (kept separate as they depend on existing tables)
  await migrateTableColumns(pg);

  console.log("[usePgWorker] Table initialization complete");
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
  } finally {
    console.log("[usePgWorker] PGlite Worker initialized successfully");
  }
}

async function createPgWorker(): Promise<PGliteWorker> {
  console.log("[usePgWorker] Creating PGlite Worker...");

  const worker = new PGliteWorker(
    new Worker("/worker/pglite.worker.js", {
      type: "module",
    }),
    {
      dataDir: "idb://multi-vendor-db",
      extensions: {
        live,
        electric: electricSync(),
      },
    },
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
    params?: any[],
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
    params?: any[],
  ): Promise<T | null> {
    const result = await query<T>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Create a live query that updates automatically
   */
  async function liveQuery<T = any>(
    sql: string,
    params?: any[],
  ): Promise<{
    subscribe: (callback: (data: T[]) => void) => () => void;
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
