import { live } from "@electric-sql/pglite/live";
import { electricSync } from "@electric-sql/pglite-sync";
import { PGliteWorker } from "@electric-sql/pglite/worker";

/**
 * Table schema definitions for PGlite client database
 * Kept for backward compatibility
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
  spaces: `
    CREATE TABLE IF NOT EXISTS spaces (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
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
  space_members: `
    CREATE TABLE IF NOT EXISTS space_members (
      id TEXT PRIMARY KEY,
      space_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      invited_by TEXT,
      UNIQUE(space_id, user_id)
    )
  `,
  space_items: `
    CREATE TABLE IF NOT EXISTS space_items (
      id TEXT PRIMARY KEY,
      space_id TEXT NOT NULL,
      parent_id TEXT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      order_index INTEGER DEFAULT 0,
      config JSONB DEFAULT '{}',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `,
  space_item_permissions: `
    CREATE TABLE IF NOT EXISTS space_item_permissions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      permission TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(item_id, user_id)
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
 * Singleton PGlite instance
 */
let pgInstance: PGliteWorker | null = null;
let initPromise: Promise<PGliteWorker> | null = null;

/**
 * Migration tracking table creation
 */
async function createMigrationTable(pg: PGliteWorker): Promise<void> {
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS pglite_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      checksum TEXT,
      success BOOLEAN DEFAULT TRUE
    )
  `);
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations(pg: PGliteWorker): Promise<Set<string>> {
  try {
    const result = await pg.query<{ migration_name: string }>(
      "SELECT migration_name FROM pglite_migrations WHERE success = TRUE"
    );
    return new Set(result.rows.map((r) => r.migration_name));
  } catch {
    return new Set();
  }
}

/**
 * Record migration as applied
 */
async function recordMigration(
  pg: PGliteWorker,
  name: string,
  checksum?: string
): Promise<void> {
  await pg.query(
    `INSERT INTO pglite_migrations (migration_name, checksum, success) 
     VALUES ($1, $2, TRUE)
     ON CONFLICT (migration_name) DO UPDATE SET
     applied_at = CURRENT_TIMESTAMP,
     checksum = EXCLUDED.checksum`,
    [name, checksum || ""]
  );
}

/**
 * Fetch migration SQL from public directory
 */
async function fetchMigrationSql(name: string): Promise<string | null> {
  try {
    const response = await fetch(`/migrations/${name}.sql`);
    if (!response.ok) {
      console.warn(`[usePgWorker] Migration file not found: ${name}.sql`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error(`[usePgWorker] Failed to fetch migration ${name}:`, error);
    return null;
  }
}

/**
 * Run migrations from public directory
 * If migration fails, drops and recreates database
 */
async function runMigrations(pg: PGliteWorker): Promise<void> {
  console.log("[usePgWorker] Running migrations...");

  // Ensure migration table exists
  await createMigrationTable(pg);

  // Get already applied migrations
  const applied = await getAppliedMigrations(pg);

  // Define migrations in order
  const migrations = [
    { name: "0000_init_migrations", description: "Initialize migration tracking" },
    { name: "0001_initial_schema", description: "Initial schema for users, companies, members" },
    { name: "0002_spaces_and_items", description: "Replace workspaces with unified spaces schema" },
  ];

  let needsReset = false;

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      console.log(`[usePgWorker] Migration ${migration.name} already applied`);
      continue;
    }

    // Fetch SQL from public directory
    const sql = await fetchMigrationSql(migration.name);
    
    if (!sql && migration.name !== "0000_init_migrations") {
      console.error(`[usePgWorker] Migration SQL not found: ${migration.name}`);
      continue;
    }

    try {
      if (sql) {
        console.log(`[usePgWorker] Applying migration: ${migration.name}`);
        await pg.exec(sql);
      }
      await recordMigration(pg, migration.name);
      console.log(`[usePgWorker] Applied migration: ${migration.name}`);
    } catch (error) {
      console.error(
        `[usePgWorker] Migration ${migration.name} failed:`,
        error
      );
      needsReset = true;
      break;
    }
  }

  if (needsReset) {
    console.log(
      "[usePgWorker] Migration failed, resetting database..."
    );
    await resetAndRecreate(pg, migrations);
  }
}

/**
 * Reset database and apply all migrations from scratch
 */
async function resetAndRecreate(
  pg: PGliteWorker,
  migrations: Array<{ name: string; description: string }>
): Promise<void> {
  console.log("[usePgWorker] Dropping all tables...");

  // Get all tables
  const result = await pg.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_type = 'BASE TABLE'`
  );

  // Drop all tables except migration table
  for (const row of result.rows) {
    if (row.table_name !== "pglite_migrations") {
      await pg.exec(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE`);
      console.log(`[usePgWorker] Dropped table: ${row.table_name}`);
    }
  }

  // Clear migration tracking
  await pg.exec("DELETE FROM pglite_migrations");

  console.log("[usePgWorker] Re-applying all migrations...");

  // Re-apply all migrations
  for (const migration of migrations) {
    const sql = await fetchMigrationSql(migration.name);
    if (sql) {
      await pg.exec(sql);
    }
    await recordMigration(pg, migration.name);
    console.log(`[usePgWorker] Applied migration: ${migration.name}`);
  }

  console.log("[usePgWorker] Database reset complete");
}

/**
 * Initialize all required tables using migrations
 */
async function initializeTables(pg: PGliteWorker): Promise<void> {
  console.log("[usePgWorker] Initializing database...");
  await runMigrations(pg);
  console.log("[usePgWorker] Database initialization complete");
}

/**
 * Get or create PGlite Worker instance
 */
export async function getPgWorker(): Promise<PGliteWorker> {
  if (pgInstance) {
    return pgInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = createPgWorker();

  try {
    pgInstance = await initPromise;
    return pgInstance;
  } catch (error) {
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
      dataDir: "idb://multi-vendor-db",
      extensions: {
        live,
        electric: electricSync(),
      },
    },
  );

  await worker.waitReady;
  console.log("[usePgWorker] PGlite Worker ready");

  await initializeTables(worker);

  return worker;
}

/**
 * Reset PGlite instance
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
 */
export function usePgWorker() {
  const isReady = useState("pg-worker-ready", () => false);
  const isLoading = useState("pg-worker-loading", () => false);
  const error = useState<Error | null>("pg-worker-error", () => null);

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

  async function exec(sql: string): Promise<void> {
    const worker = await init();
    await worker.exec(sql);
  }

  async function queryOne<T = any>(
    sql: string,
    params?: any[],
  ): Promise<T | null> {
    const result = await query<T>(sql, params);
    return result.rows[0] || null;
  }

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

  function reset(): void {
    resetPgWorker();
    isReady.value = false;
    isLoading.value = false;
    error.value = null;
  }

  async function getInstance(): Promise<PGliteWorker> {
    return await init();
  }

  return {
    isReady: readonly(isReady),
    isLoading: readonly(isLoading),
    error: readonly(error),
    init,
    query,
    queryOne,
    exec,
    liveQuery,
    reset,
    getInstance,
    get instance() {
      return pgInstance;
    },
  };
}

export default usePgWorker;
