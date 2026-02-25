import { db } from "@nuxthub/db";
import { eq, and, isNull } from "drizzle-orm";
import { spaceItemColumns } from "@nuxthub/db/schema";

// PATCH /api/space-items/[id]/columns/reorder - Reorder columns
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, "id");

  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: "Item ID required" });
  }

  const { user } = await requireUserSession(event);
  const body = await readBody(event);

  if (!body.updates || !Array.isArray(body.updates)) {
    throw createError({
      statusCode: 400,
      statusMessage: "updates array required",
    });
  }

  try {
    // Update all columns in a transaction
    for (const update of body.updates) {
      await db
        .update(spaceItemColumns)
        .set({
          orderIndex: update.order_index,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(spaceItemColumns.id, update.id),
            eq(spaceItemColumns.itemId, itemId),
          ),
        );
    }

    return { success: true, updated: body.updates.length };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to reorder columns",
    });
  }
});
