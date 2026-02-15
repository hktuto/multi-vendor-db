import { db } from "@nuxthub/db";
import { companies, companyMembers, users } from "@nuxthub/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  // Get companies where user is owner or member
  const userCompanies = await db.query.companies.findMany({
    where: and(
      isNull(companies.deletedAt),
      eq(companies.ownerId, session.user.id),
    ),
    orderBy: [desc(companies.createdAt)],
    with: {
      members: {
        where: eq(companyMembers.userId, session.user.id),
      },
      owner: {
        columns: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Also get companies where user is a member (via companyMembers)
  const memberCompanies = await db.query.companyMembers.findMany({
    where: eq(companyMembers.userId, session.user.id),
    with: {
      company: {
        where: isNull(companies.deletedAt),
        with: {
          owner: {
            columns: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  // Combine and deduplicate
  const memberCompanyIds = new Set(userCompanies.map((c) => c.id));
  const allCompanies = [
    ...userCompanies,
    ...memberCompanies
      .filter((m) => m.company && !memberCompanyIds.has(m.company.id))
      .map((m) => ({
        ...m.company!,
        members: [{ ...m, company: undefined }],
      })),
  ];

  // Add member count for each company
  const companiesWithStats = await Promise.all(
    allCompanies.map(async (company) => {
      const memberCount = await db.query.companyMembers.findMany({
        where: eq(companyMembers.companyId, company.id),
      });
      return {
        ...company,
        memberCount: memberCount.length,
        myRole:
          company.members?.[0]?.role ||
          (company.ownerId === session.user.id ? "owner" : "member"),
      };
    }),
  );

  return {
    companies: companiesWithStats,
  };
});
