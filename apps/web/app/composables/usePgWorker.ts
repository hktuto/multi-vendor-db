import { live } from "@electric-sql/pglite/live";
import { electricSync } from "@electric-sql/pglite-sync";
import { PGliteWorker } from "@electric-sql/pglite/worker";

/**
 * Singleton PGlite instance
 */
let pgInstance: PGliteWorker | null = null;
let initPromise: Promise<PGliteWorker> | null = null;

/**
 * PGlite Migration from server
 */
interface ServerMigration {
  name: string;
  tag: string;
  index: number;
  sql: string;
}

/**
 * Migration check response from server
 */
interface MigrationCheckResponse {
  migrations: ServerMigration[];
  needsReset: boolean;
  latestMigration: string | null;
  totalCount: number;
}

/**
 * Get last applied migration from local PGlite
 */
async function getLastAppliedMigration(pg: PGliteWorker): Promise<string | null> {
  try {
    const result = await pg.query<{ migration_name: string }>(
      "SELECT migration_name FROM pglite_migrations WHERE success = TRUE ORDER BY id DESC LIMIT 1"
    );
    return result.rows[0]?.migration_name || null;
  } catch {
    // Table doesn't exist yet
    return null;
  }
}

/**
 * Record migration as applied
 */
async function recordMigration(
  pg: PGliteWorker,
  name: string
): Promise<void> {
  await pg.query(
    `INSERT INTO pglite_migrations (migration_name, checksum, success) 
     VALUES ($1, '', TRUE)
     ON CONFLICT (migration_name) DO UPDATE SET
     applied_at = CURRENT_TIMESTAMP`,
    [name]
  );
}

/**
 * Check migrations with server and get needed SQL
 */
async function checkMigrationsWithServer(
  lastMigration: string | null
): Promise<MigrationCheckResponse> {
  const response = await $fetch<MigrationCheckResponse>(
    '/api/pglite/migrations/check',
    {
      method: 'POST',
      body: { lastMigration },
    }
  );
  return response;
}

/**
 * Reset all local tables (for schema mismatch)
 */
async function resetDatabase(pg: PGliteWorker): Promise<void> {
  console.log('[usePgWorker] Resetting database...');

  // Get all tables
  const result = await pg.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_type = 'BASE TABLE'`
  );

  // Drop all tables
  for (const row of result.rows) {
    await pg.exec(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE`);
    console.log(`[usePgWorker] Dropped: ${row.table_name}`);
  }

  console.log('[usePgWorker] Database reset complete');
}

/**
 * Run migrations from server
 */
async function runMigrations(pg: PGliteWorker): Promise<void> {
  console.log('[usePgWorker] Checking migrations with server...');

  // Get last applied migration
  const lastMigration = await getLastAppliedMigration(pg);
  console.log(`[usePgWorker] Last applied: ${lastMigration || 'none'}`);

  // Check with server
  const check = await checkMigrationsWithServer(lastMigration);

  // Handle reset request
  if (check.needsReset) {
    await resetDatabase(pg);
    // Re-check after reset (should get all migrations)
    const recheck = await checkMigrationsWithServer(null);
    check.migrations = recheck.migrations;
  }

  // Apply migrations
  if (check.migrations.length === 0) {
    console.log('[usePgWorker] No migrations to apply');
    return;
  }

  console.log(`[usePgWorker] Applying ${check.migrations.length} migrations...`);

  for (const migration of check.migrations) {
    try {
      console.log(`[usePgWorker] Applying: ${migration.tag}`);
      await pg.exec(migration.sql);
      await recordMigration(pg, migration.tag);
      console.log(`[usePgWorker] Applied: ${migration.tag}`);
    } catch (error) {
      console.error(`[usePgWorker] Failed to apply ${migration.tag}:`, error);
      throw error;
    }
  }

  console.log('[usePgWorker] Migrations complete');
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
  console.log('[usePgWorker] Creating PGlite Worker...');

  const worker = new PGliteWorker(
    new Worker('/worker/pglite.worker.js', {
      type: 'module',
    }),
    {
      dataDir: 'idb://multi-vendor-db',
      extensions: {
        live,
        electric: electricSync(),
      },
    }
  );

  await worker.waitReady;
  console.log('[usePgWorker] PGlite Worker ready');

  // Run migrations
  await runMigrations(worker);

  return worker;
}

/**
 * Reset PGlite instance
 */
export function resetPgWorker(): void {
  pgInstance = null;
  initPromise = null;
  console.log('[usePgWorker] Instance reset');
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
  const isReady = useState('pg-worker-ready', () => false);
  const isLoading = useState('pg-worker-loading', () => false);
  const error = useState<Error | null>('pg-worker-error', () => null);

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
    params?: any[]
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
    params?: any[]
  ): Promise<T | null> {
    const result = await query<T>(sql, params);
    return result.rows[0] || null;
  }

  async function liveQuery<T = any>(
    sql: string,
    params?: any[]
  ): Promise<{
    subscribe: (callback: (data: T[]) => void) => () => void;
    initialData: T[];
  }> {
    const worker = await init();
    const liveExtension = (worker as any).live;
    if (!liveExtension) {
      throw new Error('Live extension not available');
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
