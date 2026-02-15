import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js";
import { worker } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/worker/index.js";

console.log("worker start load")
worker({
  async init() {
    // Create and return a PGlite instance
    return new PGlite("idb://electric-sql-poc")
  }
})
