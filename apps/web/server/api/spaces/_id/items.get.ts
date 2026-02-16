import { z } from "zod";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "../../db";
import { spaceItems, spaceMembers } from "../../db/schema";
import { requireAuth } from "../utils/auth";

/**
 * GET /api/spaces/:spaceId/items
 * List all items in a space
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const spaceId = getRouterParam(event, "spaceId");

  if (!spaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Space ID is required",
    });
  }

  // Check membership
  const member = await db.query.spaceMembers.findFirst({
    where: (members, { eq, and }) =>
      and(eq(members.spaceId, spaceId), eq(members.userId, user.id)),
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
    orderBy: (items, { asc }) => [
      asc(items.parentId),
      asc(items.orderIndex),
      asc(items.name),
    ],
  });

  return items;
});
