import { db, schema } from "@nuxthub/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { uuidv7 } from "uuidv7";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
});

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
  const input = inviteSchema.parse(body);

  // Check if inviter is admin of the space
  const inviterMember = await db.query.spaceMembers.findFirst({
    where: and(
      eq(schema.spaceMembers.spaceId, spaceId),
      eq(schema.spaceMembers.userId, session.user.id)
    ),
  });

  if (!inviterMember || inviterMember.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Only space admins can invite members",
    });
  }

  // Find user by email
  const userToInvite = await db.query.users.findFirst({
    where: eq(schema.users.email, input.email),
  });

  if (!userToInvite) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found with this email",
    });
  }

  // Check if already a member
  const existingMember = await db.query.spaceMembers.findFirst({
    where: and(
      eq(schema.spaceMembers.spaceId, spaceId),
      eq(schema.spaceMembers.userId, userToInvite.id)
    ),
  });

  if (existingMember) {
    throw createError({
      statusCode: 409,
      statusMessage: "User is already a member of this space",
    });
  }

  // Add member
  const now = new Date();
  const [member] = await db
    .insert(schema.spaceMembers)
    .values({
      id: uuidv7(),
      spaceId,
      userId: userToInvite.id,
      role: input.role,
      joinedAt: now,
      invitedBy: session.user.id,
    })
    .returning();

  return {
    ...member,
    user: {
      id: userToInvite.id,
      name: userToInvite.name,
      email: userToInvite.email,
      avatarUrl: userToInvite.avatarUrl,
    },
  };
});
