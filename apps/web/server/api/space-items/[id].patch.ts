import { db } from "@nuxthub/db";
import { eq } from "drizzle-orm";
import { spaceItems } from "@nuxthub/db/schema";

// PATCH /api/space-items/[id] - Update item (including config)
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, "id");

  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: "Item ID required" });
  }

  const { user } = await requireUserSession(event);
  const body = await readBody(event);

  try {
    const updates: any = {
      updatedAt: new Date(),
    };

    // Allow updating these fields
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.color !== undefined) updates.color = body.color;
    if (body.config !== undefined) updates.config = body.config;

    const [updated] = await db
      .update(spaceItems)
      .set(updates)
      .where(eq(spaceItems.id, itemId))
      .returning();

    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: "Item not found" });
    }

    return updated;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to update item",
    });
  }
});
