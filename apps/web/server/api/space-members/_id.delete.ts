import { db, schema } from "@nuxthub/db";
import { eq, and } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const memberId = getRouterParam(event, "id");
  if (!memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Member ID is required",
    });
  }

  // Get the member being removed
  const memberToRemove = await db.query.spaceMembers.findFirst({
    where: eq(schema.spaceMembers.id, memberId),
  });

  if (!memberToRemove) {
    throw createError({
      statusCode: 404,
      statusMessage: "Member not found",
    });
  }

  // Check if remover is admin of the space (or self-removing)
  const isSelfRemoving = memberToRemove.userId === session.user.id;
  
  if (!isSelfRemoving) {
    const removerMember = await db.query.spaceMembers.findFirst({
      where: and(
        eq(schema.spaceMembers.spaceId, memberToRemove.spaceId),
        eq(schema.spaceMembers.userId, session.user.id)
      ),
    });

    if (!removerMember || removerMember.role !== "admin") {
      throw createError({
        statusCode: 403,
        statusMessage: "Only space admins can remove members",
      });
    }
  }

  // Remove member
  await db.delete(schema.spaceMembers).where(eq(schema.spaceMembers.id, memberId));

  return { success: true };
});
