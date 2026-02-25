import { spaceItems } from "@nuxthub/db/schema";
import { eq, and } from "drizzle-orm";
import { db } from "@nuxthub/db";
export default defineEventHandler(async (event) => {
  const spaceId = getRouterParam(event, "id");

  if (!spaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Space ID is required",
    });
  }

  const { user } = await getUserSession(event);

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  // Check space membership
  const membership = await db.query.spaceMembers.findFirst({
    where: (members, { eq, and }) =>
      and(eq(members.spaceId, spaceId), eq(members.userId, user.id)),
  });

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: "Access denied",
    });
  }

  // Check permissions
  if (!["admin", "editor"].includes(membership.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Insufficient permissions",
    });
  }

  const body = await readBody(event);
  const { items } = body as {
    items: { id: string; orderIndex: number; parentId: string | null }[];
  };

  if (!Array.isArray(items)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Items array is required",
    });
  }

  // Update each item
  for (const item of items) {
    // Verify item belongs to this space
    const existingItem = await db.query.spaceItems.findFirst({
      where: (items, { eq, and }) =>
        and(eq(items.id, item.id), eq(items.spaceId, spaceId)),
    });

    if (existingItem) {
      await db
        .update(spaceItems)
        .set({
          orderIndex: item.orderIndex,
          parentId: item.parentId,
          updatedAt: new Date(),
        })
        .where(eq(spaceItems.id, item.id));
    }
  }

  return { success: true };
});
