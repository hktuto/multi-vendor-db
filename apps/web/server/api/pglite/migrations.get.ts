import { db, schema } from "@nuxthub/db";
import { desc } from "drizzle-orm";

/**
 * GET /api/pglite/migrations
 * Returns the list of migrations that should be applied to PGlite
 * 
 * This endpoint provides the source of truth for PGlite schema migrations.
 * The client (PGlite worker) calls this to get migration history and
 * applies them in order.
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  // Return migration metadata
  // The actual SQL files are in server/db/migrations/pglite/
  // Client will fetch and apply them
  const migrations = [
    {
      name: "0000_init_migrations",
      description: "Initialize migration tracking table",
      checksum: "init",
    },
    {
      name: "0001_initial_schema",
      description: "Initial schema for users, companies, members",
      checksum: "initial",
    },
    {
      name: "0002_spaces_and_items",
      description: "Replace workspaces with unified spaces schema",
      checksum: "spaces_v1",
    },
  ];

  return {
    migrations,
    currentVersion: "0002_spaces_and_items",
    recommendedAction: "apply_pending", // apply_pending | reset | none
  };
});
