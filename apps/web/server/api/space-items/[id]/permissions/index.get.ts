import { db } from "@nuxthub/db";
import { eq, and, isNull } from "drizzle-orm";
import { spaceItemPermissions } from "@nuxthub/db/schema";

// GET /api/space-items/[id]/permissions - List permissions for an item
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, "id");

  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: "Item ID required" });
  }

  try {
    const permissions = await db.query.spaceItemPermissions.findMany({
      where: eq(spaceItemPermissions.itemId, itemId),
    });

    return permissions;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to fetch permissions",
    });
  }
});
