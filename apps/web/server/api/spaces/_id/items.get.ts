import { db } from "@nuxthub/db";
import { spaceItems, spaceMembers } from "@nuxthub/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

/**
 * GET /api/spaces/:id/items
 * List all items in a space
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const spaceId = getRouterParam(event, "id");

  if (!spaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Space ID is required",
    });
  }

  // Check membership
  const member = await db.query.spaceMembers.findFirst({
    where: (members, { eq, and }) =>
      and(eq(members.spaceId, spaceId), eq(members.userId, session.user.id)),
  });

  if (!member) {
    throw createError({
      statusCode: 403,
      statusMessage: "Not a member of this space",
    });
  }

  const items = await db.query.spaceItems.findMany({
    where: (items, { eq, and, isNull }) =>
      and(eq(items.spaceId, spaceId), isNull(items.deletedAt)),
    orderBy: [
      asc(items.parentId),
      asc(items.orderIndex),
      asc(items.name),
    ],
  });

  return items;
});
