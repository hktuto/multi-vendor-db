import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js";
import { worker } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/worker/index.js";

console.log("worker start load")
worker({
  async init(options) {
    // Create and return a PGlite instance
    return new PGlite({
      dataDir: options.dataDir,
      extensions: options.extensions
    })
  }
})
