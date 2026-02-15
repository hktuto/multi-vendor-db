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

  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Company ID is required",
    });
  }

  // Get company with members
  const company = await db.query.companies.findFirst({
    where: and(eq(companies.id, id), isNull(companies.deletedAt)),
    with: {
      owner: {
        columns: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      members: {
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          invitedByUser: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!company) {
    throw createError({
      statusCode: 404,
      statusMessage: "Company not found",
    });
  }

  // Check if user has access to this company
  const hasAccess =
    company.ownerId === session.user.id ||
    company.members.some((m) => m.userId === session.user.id);

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: "Access denied",
    });
  }

  // Determine user's role
  const myRole =
    company.ownerId === session.user.id
      ? "owner"
      : company.members.find((m) => m.userId === session.user.id)?.role ||
        "member";

  return {
    company: {
      ...company,
      myRole,
    },
  };
});
