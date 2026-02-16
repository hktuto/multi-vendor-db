import { db, schema } from "@nuxthub/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { uuidv7 } from "uuidv7";

const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
});

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const body = await readBody(event);

  // Validate input
  const result = createCompanySchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Invalid input: " +
        result.error.errors.map((e) => e.message).join(", "),
    });
  }

  const { name, slug } = result.data;

  // Check if slug is already taken
  const existingCompany = await db.query.companies.findFirst({
    where: eq(schema.companies.slug, slug),
  });

  if (existingCompany) {
    throw createError({
      statusCode: 409,
      statusMessage: "Company slug already exists",
    });
  }

  // Generate UUID for the company
  const companyId = uuidv7();

  // Create company
  const [company] = await db
    .insert(schema.companies)
    .values({
      id: companyId,
      name,
      slug,
      ownerId: session.user.id,
      settings: {
        timezone: "UTC",
        dateFormat: "YYYY-MM-DD",
        defaultLanguage: "en",
        theme: {},
      },
    })
    .returning();

  // Add owner as admin member
  await db.insert(schema.companyMembers).values({
    id: uuidv7(),
    companyId: company.id,
    userId: session.user.id,
    role: "admin",
    invitedBy: session.user.id,
  });

  return {
    company,
  };
});
