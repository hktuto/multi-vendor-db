import { db } from "@nuxthub/db";
import { companies, companyMembers } from "@nuxthub/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

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

  const body = await readBody(event);

  // Validate input
  const result = updateRoleSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Invalid input: " +
        result.error.issues.map((e: any) => e.message).join(", "),
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

  // Only owner can update roles
  if (company.ownerId !== session.user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only the company owner can update member roles",
    });
  }

  // Cannot update owner's role
  if (userId === company.ownerId) {
    throw createError({
      statusCode: 403,
      statusMessage: "Cannot change the owner's role",
    });
  }

  // Update member role
  const [updatedMember] = await db
    .update(companyMembers)
    .set({ role: result.data.role })
    .where(
      and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, userId),
      ),
    )
    .returning();

  if (!updatedMember) {
    throw createError({
      statusCode: 404,
      statusMessage: "Member not found",
    });
  }

  return {
    member: updatedMember,
  };
});
