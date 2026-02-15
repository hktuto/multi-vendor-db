import { db } from "@nuxthub/db";
import { companies, inviteLinks } from "@nuxthub/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export default defineEventHandler(async (event) => {
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
      eq(inviteLinks.token, token),
      eq(inviteLinks.isActive, true),
      isNull(inviteLinks.usedAt),
    ),
    with: {
      company: {
        columns: {
          id: true,
          name: true,
          slug: true,
        },
      },
      createdByUser: {
        columns: {
          id: true,
          name: true,
        },
      },
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

  return {
    invite: {
      token: invite.token,
      role: invite.role,
      company: invite.company,
      invitedBy: invite.createdByUser,
    },
  };
});
