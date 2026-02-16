import { db, schema } from "@nuxthub/db";
import { eq, and, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const token = getRouterParam(event, "token");

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invite token is required",
    });
  }

  // Find the invite
  const invite = await db.query.inviteLinks.findFirst({
    where: and(
      eq(schema.inviteLinks.token, token),
      eq(schema.inviteLinks.isActive, true),
      isNull(schema.inviteLinks.usedAt),
    ),
    with: {
      company: true,
    },
  });

  if (!invite) {
    throw createError({
      statusCode: 404,
      statusMessage: "Invalid or expired invite link",
    });
  }

  // Check if expired
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    throw createError({
      statusCode: 410,
      statusMessage: "Invite link has expired",
    });
  }

  // Check max uses
  if (invite.maxUses && invite.usedCount >= invite.maxUses) {
    throw createError({
      statusCode: 410,
      statusMessage: "Invite link has reached maximum uses",
    });
  }

  // Check if user is already a member
  const existingMember = await db.query.companyMembers.findFirst({
    where: and(
      eq(schema.companyMembers.companyId, invite.companyId),
      eq(schema.companyMembers.userId, session.user.id),
    ),
  });

  if (existingMember) {
    throw createError({
      statusCode: 409,
      statusMessage: "You are already a member of this company",
    });
  }

  // Check if user is the owner
  if (invite.company.ownerId === session.user.id) {
    throw createError({
      statusCode: 409,
      statusMessage: "You are the owner of this company",
    });
  }

  // Add user as member
  await db.insert(schema.companyMembers).values({
    id: uuidv7(),
    companyId: invite.companyId,
    userId: session.user.id,
    role: invite.role,
    invitedBy: invite.createdBy,
  });

  // Update invite usage
  const newUsedCount = invite.usedCount + 1;
  const updates: any = {
    usedCount: newUsedCount,
    usedAt: new Date(),
    usedBy: session.user.id,
  };

  // Deactivate if max uses reached
  if (invite.maxUses && newUsedCount >= invite.maxUses) {
    updates.isActive = false;
  }

  await db
    .update(schema.inviteLinks)
    .set(updates)
    .where(eq(schema.inviteLinks.id, invite.id));

  return {
    success: true,
    message: "You have successfully joined the company",
    company: {
      id: invite.company.id,
      name: invite.company.name,
      slug: invite.company.slug,
    },
  };
});
