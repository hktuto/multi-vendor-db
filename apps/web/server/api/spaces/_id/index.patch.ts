import { db, schema } from "@nuxthub/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSpaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
  settings: z.record(z.any()).optional(),
});

/**
 * PATCH /api/spaces/:id
 * Update a space
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

  const body = await readBody(event);
  const input = updateSpaceSchema.parse(body);

  // Check if user is admin of the space
  const member = await db.query.spaceMembers.findFirst({
    where: (members, { eq, and }) =>
      and(eq(members.spaceId, spaceId), eq(members.userId, session.user.id)),
  });

  if (!member || member.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Only space admins can update settings",
    });
  }

  // Update space
  const [updated] = await db
    .update(schema.spaces)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(schema.spaces.id, spaceId))
    .returning();

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: "Space not found",
    });
  }

  return updated;
});
