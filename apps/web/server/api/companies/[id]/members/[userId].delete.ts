import { db } from "@nuxthub/db";
import { companies, companyMembers } from "@nuxthub/db/schema";
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
  const userId = getRouterParam(event, "userId");

  if (!companyId || !userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Company ID and User ID are required",
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

  // Check permissions
  const isOwner = company.ownerId === session.user.id;
  const isAdmin = await db.query.companyMembers.findFirst({
    where: and(
      eq(companyMembers.companyId, companyId),
      eq(companyMembers.userId, session.user.id),
      eq(companyMembers.role, "admin"),
    ),
  });

  // Users can remove themselves, owners/admins can remove others
  const isSelf = userId === session.user.id;

  if (!isOwner && !isAdmin && !isSelf) {
    throw createError({
      statusCode: 403,
      statusMessage: "You do not have permission to remove this member",
    });
  }

  // Cannot remove owner
  if (userId === company.ownerId) {
    throw createError({
      statusCode: 403,
      statusMessage: "Cannot remove the company owner",
    });
  }

  // Remove member
  await db
    .delete(companyMembers)
    .where(
      and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, userId),
      ),
    );

  return {
    success: true,
    message: "Member removed successfully",
  };
});
