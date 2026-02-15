import type { PGliteInterface } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { electricSync } from "@electric-sql/pglite-sync";
import { PGliteWorker } from "@electric-sql/pglite/worker";

/**
 * Singleton PGlite instance
 * Shared across all composables
 */
let pgInstance: any = null;
let initPromise: Promise<any> | null = null;

/**
 * Get or create PGlite Worker instance
 * Returns singleton to avoid multiple connections
 */
export async function getPgWorker(): Promise<any> {
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

async function createPgWorker(): Promise<any> {
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
export function resetPgWorker() {
  pgInstance = null;
  initPromise = null;
  console.log("[usePgWorker] Instance reset");
}

/**
 * Composable wrapper for convenience
 */
export function usePgWorker() {
  const isReady = useState("pg-worker-ready", () => false);
  const isLoading = useState("pg-worker-loading", () => false);
  const error = useState<Error | null>("pg-worker-error", () => null);

  async function init() {
    if (isReady.value) return pgInstance;
    
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

  function reset() {
    resetPgWorker();
    isReady.value = false;
    isLoading.value = false;
    error.value = null;
  }

  return {
    // State
    isReady: readonly(isReady),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Methods
    init,
    reset,
    get instance() { return pgInstance; }
  };
}
