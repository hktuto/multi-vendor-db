import { db, schema } from "@nuxthub/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
});

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

  const body = await readBody(event);
  const input = updateSchema.parse(body);

  // Get the member being updated
  const memberToUpdate = await db.query.spaceMembers.findFirst({
    where: eq(schema.spaceMembers.id, memberId),
  });

  if (!memberToUpdate) {
    throw createError({
      statusCode: 404,
      statusMessage: "Member not found",
    });
  }

  // Check if updater is admin of the space
  const updaterMember = await db.query.spaceMembers.findFirst({
    where: and(
      eq(schema.spaceMembers.spaceId, memberToUpdate.spaceId),
      eq(schema.spaceMembers.userId, session.user.id)
    ),
  });

  if (!updaterMember || updaterMember.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Only space admins can update member roles",
    });
  }

  // Update role
  const [updated] = await db
    .update(schema.spaceMembers)
    .set({ role: input.role })
    .where(eq(schema.spaceMembers.id, memberId))
    .returning();

  return updated;
});
