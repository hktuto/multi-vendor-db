import { MIGRATION_SQL, PGLITE_MIGRATIONS } from "./index.get";

/**
 * GET /api/pglite/migrations/:name
 * Returns specific migration SQL content for PGlite client
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const name = getRouterParam(event, "name");

  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: "Migration name is required",
    });
  }

  // Validate migration name (prevent path traversal)
  const validMigration = PGLITE_MIGRATIONS.find(m => m.name === name);
  if (!validMigration) {
    throw createError({
      statusCode: 404,
      statusMessage: "Migration not found",
    });
  }

  const sql = MIGRATION_SQL[name];
  
  if (!sql) {
    throw createError({
      statusCode: 404,
      statusMessage: "Migration SQL not found",
    });
  }

  return {
    name,
    sql,
    metadata: validMigration,
  };
});
