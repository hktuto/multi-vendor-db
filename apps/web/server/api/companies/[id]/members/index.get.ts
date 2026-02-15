import { db } from "@nuxthub/db";
import { companies, companyMembers, users } from "@nuxthub/db/schema";
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

  if (!companyId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Company ID is required",
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

  // Check if user has access
  const hasAccess =
    company.ownerId === session.user.id ||
    (await db.query.companyMembers.findFirst({
      where: and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, session.user.id),
      ),
    }));

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: "Access denied",
    });
  }

  // Get all members
  const members = await db.query.companyMembers.findMany({
    where: eq(companyMembers.companyId, companyId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          isActive: true,
        },
      },
      invitedByUser: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Add owner as a member
  const owner = await db.query.users.findFirst({
    where: eq(users.id, company.ownerId),
    columns: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      isActive: true,
    },
  });

  const allMembers = [
    ...(owner
      ? [
          {
            id: "owner",
            companyId,
            userId: owner.id,
            role: "owner" as const,
            joinedAt: company.createdAt,
            invitedBy: null,
            user: owner,
            invitedByUser: null,
          },
        ]
      : []),
    ...members.filter((m) => m.userId !== company.ownerId),
  ];

  return {
    members: allMembers,
  };
});
