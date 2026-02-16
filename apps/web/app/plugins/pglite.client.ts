import { usePgWorker } from "../composables/usePgWorker";

/**
 * PGlite Client Plugin
 *
 * Pre-initializes PGlite Worker before any page renders.
 * This prevents race conditions when multiple components simultaneously
 * try to create the worker on first page load.
 *
 * The plugin runs on client-side only (.client.ts suffix).
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  console.log("[pglite-plugin] Initializing PGlite Worker...");

  try {
    await getPgWorker();
  } catch (error) {
    console.error("[pglite-plugin] Failed to initialize PGlite Worker:", error);
    // Don't throw - let the app continue and handle errors in composables
  }
});
