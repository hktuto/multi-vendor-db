import { db } from "@nuxthub/db";
import { companies, companyMembers, users } from "@nuxthub/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const addMemberSchema = z.object({
  email: z.string().email(),
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

  if (!companyId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Company ID is required",
    });
  }

  const body = await readBody(event);

  // Validate input
  const result = addMemberSchema.safeParse(body);
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

  // Check if user is owner or admin
  const isOwner = company.ownerId === session.user.id;
  const isAdmin = await db.query.companyMembers.findFirst({
    where: and(
      eq(companyMembers.companyId, companyId),
      eq(companyMembers.userId, session.user.id),
      eq(companyMembers.role, "admin"),
    ),
  });

  if (!isOwner && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only company owners and admins can add members",
    });
  }

  // Find user by email
  const userToAdd = await db.query.users.findFirst({
    where: eq(users.email, result.data.email),
  });

  if (!userToAdd) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found with this email",
    });
  }

  // Check if already a member
  const existingMember = await db.query.companyMembers.findFirst({
    where: and(
      eq(companyMembers.companyId, companyId),
      eq(companyMembers.userId, userToAdd.id),
    ),
  });

  if (existingMember) {
    throw createError({
      statusCode: 409,
      statusMessage: "User is already a member of this company",
    });
  }

  // Cannot add owner as member
  if (userToAdd.id === company.ownerId) {
    throw createError({
      statusCode: 409,
      statusMessage: "User is already the owner of this company",
    });
  }

  // Add member
  const [member] = await db
    .insert(companyMembers)
    .values({
      id: crypto.randomUUID(),
      companyId,
      userId: userToAdd.id,
      role: result.data.role,
      invitedBy: session.user.id,
    })
    .returning();

  return {
    member: {
      ...member,
      user: {
        id: userToAdd.id,
        name: userToAdd.name,
        email: userToAdd.email,
        avatarUrl: userToAdd.avatarUrl,
        isActive: userToAdd.isActive,
      },
    },
  };
});
