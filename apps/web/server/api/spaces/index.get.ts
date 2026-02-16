import { db, schema } from "@nuxthub/db";
import { inArray, isNull, eq } from "drizzle-orm";

/**
 * GET /api/spaces
 * List all spaces the user has access to
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  // Get all companies the user is a member of
  const userCompanies = await db.query.companyMembers.findMany({
    where: (members, { eq }) => eq(members.userId, session.user.id),
    columns: { companyId: true },
  });

  const companyIds = userCompanies.map((m) => m.companyId);

  if (companyIds.length === 0) {
    return [];
  }

  // Get all spaces from those companies
  const userSpaces = await db.query.spaces.findMany({
    where: (spaces, { inArray, isNull }) =>
      inArray(spaces.companyId, companyIds) && isNull(spaces.deletedAt),
    orderBy: (spaces, { asc }) => [asc(spaces.name)],
  });

  return userSpaces;
});
