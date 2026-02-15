import { db } from "@nuxthub/db";
import { companies } from "@nuxthub/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z
    .object({
      timezone: z.string().optional(),
      dateFormat: z.string().optional(),
      defaultLanguage: z.string().optional(),
      theme: z.record(z.any()).optional(),
    })
    .optional(),
});

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

  const body = await readBody(event);

  // Validate input
  const result = updateCompanySchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Invalid input: " +
        result.error.issues.map((e: any) => e.message).join(", "),
    });
  }

  // Check if company exists and user has permission
  const existingCompany = await db.query.companies.findFirst({
    where: and(eq(companies.id, id), isNull(companies.deletedAt)),
  });

  if (!existingCompany) {
    throw createError({
      statusCode: 404,
      statusMessage: "Company not found",
    });
  }

  // Only owner can update company
  if (existingCompany.ownerId !== session.user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only the company owner can update company settings",
    });
  }

  // Build update object
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (result.data.name !== undefined) {
    updateData.name = result.data.name;
  }

  if (result.data.settings !== undefined) {
    updateData.settings = {
      ...existingCompany.settings,
      ...result.data.settings,
    };
  }

  // Update company
  const [updatedCompany] = await db
    .update(companies)
    .set(updateData)
    .where(eq(companies.id, id))
    .returning();

  return {
    company: updatedCompany,
  };
});
