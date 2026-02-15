import { db } from "@nuxthub/db";
import { companies, inviteLinks } from "@nuxthub/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const companyId = getRouterParam(event, "id");

  if (!companyId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Company ID is required",
    });
  }

  // Check if company exists and user has access
  const company = await db.query.companies.findFirst({
    where: and(eq(companies.id, companyId), isNull(companies.deletedAt)),
  });

  if (!company) {
    throw createError({
      statusCode: 404,
      statusMessage: "Company not found",
    });
  }

  // Only owner and admins can view invites
  const hasAccess = company.ownerId === session.user.id;

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: "Access denied",
    });
  }

  // Get all active invite links
  const invites = await db.query.inviteLinks.findMany({
    where: and(
      eq(inviteLinks.companyId, companyId),
      eq(inviteLinks.isActive, true),
      isNull(inviteLinks.usedAt),
    ),
    with: {
      createdByUser: {
        columns: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: (inviteLinks, { desc }) => [desc(inviteLinks.createdAt)],
  });

  // Add full invite URLs
  const appUrl = process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000";
  const invitesWithUrls = invites.map((invite) => ({
    ...invite,
    inviteUrl: `${appUrl}/invite/${invite.token}`,
  }));

  return {
    invites: invitesWithUrls,
  };
});
