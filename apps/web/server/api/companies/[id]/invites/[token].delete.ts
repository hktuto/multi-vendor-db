import { db } from "@nuxthub/db";
import { companies, inviteLinks } from "@nuxthub/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const companyId = getRouterParam(event, "id");
  const token = getRouterParam(event, "token");

  if (!companyId || !token) {
    throw createError({
      statusCode: 400,
      statusMessage: "Company ID and token are required",
    });
  }

  // Check if company exists
  const company = await db.query.companies.findFirst({
    where: and(eq(companies.id, companyId), isNull(companies.deletedAt)),
  });

  if (!company) {
    throw createError({
      statusCode: 404,
      statusMessage: "Company not found",
    });
  }

  // Only owner can cancel invites
  if (company.ownerId !== session.user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only company owner can cancel invites",
    });
  }

  // Deactivate the invite
  await db
    .update(inviteLinks)
    .set({ isActive: false })
    .where(
      and(eq(inviteLinks.companyId, companyId), eq(inviteLinks.token, token)),
    );

  return {
    success: true,
    message: "Invite cancelled successfully",
  };
});
