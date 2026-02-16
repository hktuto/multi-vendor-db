import { db, schema } from "@nuxthub/db";
import { eq, and, isNull } from "drizzle-orm";

/**
 * DELETE /api/spaces/:id
 * Archive (soft delete) a space
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

  // Check if user is admin of the space
  const member = await db.query.spaceMembers.findFirst({
    where: (members, { eq, and }) =>
      and(eq(members.spaceId, spaceId), eq(members.userId, session.user.id)),
  });

  if (!member || member.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Only space admins can archive spaces",
    });
  }

  // Soft delete (archive)
  const [updated] = await db
    .update(schema.spaces)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.spaces.id, spaceId), isNull(schema.spaces.deletedAt)))
    .returning();

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: "Space not found",
    });
  }

  return { success: true, archived: true };
});
