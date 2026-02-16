import { eq, and, isNull } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { spaces, spaceMembers } from "@nuxthub/db/schema";
import { requireAuth } from "../../utils/auth";

/**
 * DELETE /api/spaces/:id
 * Archive (soft delete) a space
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const spaceId = getRouterParam(event, "id");

  if (!spaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Space ID is required",
    });
  }

  // Check if user is admin of the space
  const member = await db.query.spaceMembers.findFirst({
    where: (members, { eq, and }) =>
      and(eq(members.spaceId, spaceId), eq(members.userId, user.id)),
  });

  if (!member || member.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Only space admins can archive spaces",
    });
  }

  // Soft delete (archive)
  const [updated] = await db
    .update(spaces)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(spaces.id, spaceId), isNull(spaces.deletedAt)))
    .returning();

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: "Space not found",
    });
  }

  return { success: true, archived: true };
});
