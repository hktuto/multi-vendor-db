import { db } from "@nuxthub/db";
import { companies } from "@nuxthub/db/schema";
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

  // Check if company exists
  const existingCompany = await db.query.companies.findFirst({
    where: and(eq(companies.id, id), isNull(companies.deletedAt)),
  });

  if (!existingCompany) {
    throw createError({
      statusCode: 404,
      statusMessage: "Company not found",
    });
  }

  // Only owner can delete company
  if (existingCompany.ownerId !== session.user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only the company owner can delete the company",
    });
  }

  // Soft delete - set deletedAt
  await db
    .update(companies)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(companies.id, id));

  return {
    success: true,
    message: "Company deleted successfully",
  };
});
