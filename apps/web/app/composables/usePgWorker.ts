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
 * Reset all local tables (except pglite_migrations)
 */
async function resetDatabase(pg: PGliteWorker): Promise<void> {
  console.log('[usePgWorker] Resetting database...');

  const result = await pg.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
     AND table_type = 'BASE TABLE'`
  );

  for (const row of result.rows) {
    // Don't drop the migration tracking table
    if (row.table_name !== 'pglite_migrations') {
      await pg.exec(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE`);
      console.log(`[usePgWorker] Dropped: ${row.table_name}`);
    }
  }

  console.log('[usePgWorker] Database reset complete');
}

/**
 * Ensure pglite_migrations table exists
 * This is the migration tracking table for PGlite client database
 */
async function ensureMigrationTable(pg: PGliteWorker): Promise<void> {
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS pglite_migrations (
      id SERIAL PRIMARY KEY,
      migration_name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      checksum TEXT,
      success BOOLEAN DEFAULT TRUE
    )
  `);
}

/**
 * Run migrations
 */
async function runMigrations(pg: PGliteWorker): Promise<void> {
  console.log('[usePgWorker] Checking migrations...');

  // First, ensure migration table exists
  await ensureMigrationTable(pg);

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
  
  // Post-migration: Set all foreign key constraints to DEFERRED for Electric SQL sync
  await setForeignKeysDeferred(worker);
}

/**
 * Set all foreign key constraints to DEFERRABLE INITIALLY DEFERRED
 * This allows Electric SQL to sync child tables before parent tables arrive
 */
async function setForeignKeysDeferred(pg: PGliteWorker): Promise<void> {
  try {
    // Check if already set
    const checkResult = await pg.query<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
      AND table_schema = 'public'
    `);
    
    const fkCount = parseInt(checkResult.rows[0]?.count || '0');
    if (fkCount === 0) {
      console.log('[usePgWorker] No FK constraints found');
      return;
    }
    
    console.log(`[usePgWorker] Setting ${fkCount} FK constraints to DEFERRED...`);
    
    // Get constraint names that need updating
    const result = await pg.query<{ conname: string; conrelid: string }>(`
      SELECT 
        conname,
        relname as conrelid
      FROM pg_constraint
      JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
      WHERE contype = 'f'
      AND condeferrable = false
    `);
    
    if (result.rows.length === 0) {
      console.log('[usePgWorker] All FK constraints already deferrable');
      return;
    }
    
    console.log(`[usePgWorker] Updating ${result.rows.length} FK constraints...`);
    
    // Update each constraint
    for (const row of result.rows) {
      try {
        // Get constraint definition
        const defResult = await pg.query<{ pg_get_constraintdef: string }>(`
          SELECT pg_get_constraintdef(oid) as pg_get_constraintdef
          FROM pg_constraint
          WHERE conname = $1
        `, [row.conname]);
        
        const fkDef = defResult.rows[0]?.pg_get_constraintdef;
        if (!fkDef) continue;
        
        // Extract the actual FK definition (remove "FOREIGN KEY")
        const cleanDef = fkDef.replace(/^FOREIGN KEY /, '');
        
        // Drop and recreate as deferrable
        await pg.exec(`ALTER TABLE "${row.conrelid}" DROP CONSTRAINT IF EXISTS "${row.conname}"`);
        await pg.exec(`ALTER TABLE "${row.conrelid}" ADD CONSTRAINT "${row.conname}" FOREIGN KEY ${cleanDef} DEFERRABLE INITIALLY DEFERRED`);
        
      } catch (fkError) {
        console.warn(`[usePgWorker] Failed to update FK ${row.conname}:`, fkError);
      }
    }
    
    console.log('[usePgWorker] FK constraints updated to DEFERRED');
  } catch (error) {
    console.error('[usePgWorker] Failed to set FK constraints:', error);
  }
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
  
  // Set foreign key constraints to DEFERRED for Electric SQL sync
  // This allows child tables to sync before parent tables
  await worker.exec('SET CONSTRAINTS ALL DEFERRED');
  console.log('[usePgWorker] Foreign key constraints set to DEFERRED');
  
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
