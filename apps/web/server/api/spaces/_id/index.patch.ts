import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../../../db";
import { spaces, spaceMembers } from "../../../db/schema";
import { requireAuth } from "../../utils/auth";

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
  const user = await requireAuth(event);
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
      and(eq(members.spaceId, spaceId), eq(members.userId, user.id)),
  });

  if (!member || member.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Only space admins can update settings",
    });
  }

  // Update space
  const [updated] = await db
    .update(spaces)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(spaces.id, spaceId))
    .returning();

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: "Space not found",
    });
  }

  return updated;
});
