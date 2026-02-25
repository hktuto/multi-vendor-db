import { db } from "@nuxthub/db";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { spaceItemRows, spaceItems } from "@nuxthub/db/schema";

// GET /api/space-items/[id]/rows - List rows for a table/view
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, "id");

  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: "Item ID required" });
  }

  const query = getQuery(event);
  const limit = Math.min(parseInt(query.limit as string) || 50, 100);
  const offset = parseInt(query.offset as string) || 0;

  try {
    // Get item to check if it's a view
    const item = await db.query.spaceItems.findFirst({
      where: eq(spaceItems.id, itemId),
    });

    // For views, query rows from source table
    const targetItemId = item?.type === "view" ? item.source_table_id : itemId;

    if (!targetItemId) {
      throw createError({
        statusCode: 400,
        statusMessage: "View has no source table",
      });
    }

    const rows = await db.query.spaceItemRows.findMany({
      where: and(
        eq(spaceItemRows.itemId, targetItemId),
        isNull(spaceItemRows.deletedAt),
      ),
      orderBy: [desc(spaceItemRows.createdAt)],
      limit,
      offset,
    });

    return rows;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to fetch rows",
    });
  }
});
