import { db } from "@nuxthub/db";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { spaceItemColumns } from "@nuxthub/db/schema";

// GET /api/space-items/[id]/columns - List all columns for a table/view
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, "id");

  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: "Item ID required" });
  }

  try {
    const columns = await db.query.spaceItemColumns.findMany({
      where: and(
        eq(spaceItemColumns.itemId, itemId),
        isNull(spaceItemColumns.deletedAt),
      ),
      orderBy: [asc(spaceItemColumns.orderIndex)],
    });

    return columns;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to fetch columns",
    });
  }
});
