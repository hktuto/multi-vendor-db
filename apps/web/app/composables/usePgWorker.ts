import { live } from "@electric-sql/pglite/live";
import { electricSync } from "@electric-sql/pglite-sync";
import { PGliteWorker } from "@electric-sql/pglite/worker";

/**
 * Singleton PGlite instance
 */
let pgInstance: PGliteWorker | null = null;
let initPromise: Promise<PGliteWorker> | null = null;

/**
 * Journal entry from _journal.json
 */
interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
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
 * Fetch journal.json from public directory
 */
async function fetchJournal(): Promise<{ entries: JournalEntry[] } | null> {
  try {
    const response = await fetch('/.data/db/migrations/postgresql/meta/_journal.json');
    if (!response.ok) throw new Error('Journal not found');
    return await response.json();
  } catch (error) {
    console.error('[usePgWorker] Failed to fetch journal:', error);
    return null;
  }
}

/**
 * Fetch migration SQL from public directory
 */
async function fetchMigrationSql(tag: string): Promise<string | null> {
  try {
    const response = await fetch(`/.data/db/migrations/postgresql/${tag}.sql`);
    if (!response.ok) throw new Error(`SQL not found for ${tag}`);
    return await response.text();
  } catch (error) {
    console.error(`[usePgWorker] Failed to fetch SQL for ${tag}:`, error);
    return null;
  }
}

/**
 * Reset all local tables
 */
async function resetDatabase(pg: PGliteWorker): Promise<void> {
  console.log('[usePgWorker] Resetting database...');

  const result = await pg.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_type = 'BASE TABLE'`
  );

  for (const row of result.rows) {
    await pg.exec(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE`);
    console.log(`[usePgWorker] Dropped: ${row.table_name}`);
  }

  console.log('[usePgWorker] Database reset complete');
}

/**
 * Run migrations
 */
async function runMigrations(pg: PGliteWorker): Promise<void> {
  console.log('[usePgWorker] Checking migrations...');

  const journal = await fetchJournal();
  if (!journal) {
    console.error('[usePgWorker] No journal found');
    return;
  }

  // Sort entries by index
  const sortedEntries = journal.entries.sort((a, b) => a.idx - b.idx);
  
  const lastMigration = await getLastAppliedMigration(pg);
  console.log(`[usePgWorker] Last applied: ${lastMigration || 'none'}`);

  // Check if reset needed
  let needsReset = false;
  let startFromIndex = 0;

  if (lastMigration) {
    const clientIndex = sortedEntries.findIndex(e => e.tag === lastMigration);
    if (clientIndex === -1) {
      needsReset = true;
      console.log(`[usePgWorker] Migration ${lastMigration} not found, resetting`);
    } else {
      startFromIndex = clientIndex + 1;
    }
  }

  if (needsReset) {
    await resetDatabase(pg);
    startFromIndex = 0;
  }

  // Apply needed migrations
  const entriesToApply = sortedEntries.slice(startFromIndex);
  
  if (entriesToApply.length === 0) {
    console.log('[usePgWorker] No migrations to apply');
    return;
  }

  console.log(`[usePgWorker] Applying ${entriesToApply.length} migrations...`);

  for (const entry of entriesToApply) {
    const sql = await fetchMigrationSql(entry.tag);
    if (!sql) {
      console.error(`[usePgWorker] SQL not found for ${entry.tag}`);
      continue;
    }

    try {
      console.log(`[usePgWorker] Applying: ${entry.tag}`);
      await pg.exec(sql);
      await recordMigration(pg, entry.tag);
      console.log(`[usePgWorker] Applied: ${entry.tag}`);
    } catch (error) {
      console.error(`[usePgWorker] Failed to apply ${entry.tag}:`, error);
      throw error;
    }
  }

  console.log('[usePgWorker] Migrations complete');
}

/**
 * Get or create PGlite Worker instance
 */
export async function getPgWorker(): Promise<PGliteWorker> {
  if (pgInstance) return pgInstance;
  if (initPromise) return initPromise;

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
    new Worker('/worker/pglite.worker.js', { type: 'module' }),
    {
      dataDir: 'idb://multi-vendor-db',
      extensions: { live, electric: electricSync() },
    }
  );

  await worker.waitReady;
  console.log('[usePgWorker] PGlite Worker ready');

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
 * Composable wrapper
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

  async function query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const worker = await init();
    const result = await worker.query<T>(sql, params);
    return { rows: result.rows || [], affectedRows: result.affectedRows };
  }

  async function exec(sql: string): Promise<void> {
    const worker = await init();
    await worker.exec(sql);
  }

  async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await query<T>(sql, params);
    return result.rows[0] || null;
  }

  async function liveQuery<T = any>(sql: string, params?: any[]): Promise<{
    subscribe: (callback: (data: T[]) => void) => () => void;
    initialData: T[];
  }> {
    const worker = await init();
    const liveExtension = (worker as any).live;
    if (!liveExtension) throw new Error('Live extension not available');
    
    const liveResult = await liveExtension.query(sql, params);
    return {
      subscribe: (callback: (data: T[]) => void) => {
        return liveResult.subscribe((result: { rows: T[] }) => callback(result.rows));
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
    getInstance: init,
    get instance() { return pgInstance; },
  };
}

export default usePgWorker;