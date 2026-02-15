import { db } from "@nuxthub/db";
import { companies, inviteLinks } from "@nuxthub/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const createInviteSchema = z.object({
  role: z.enum(["admin", "member"]).default("member"),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

function generateToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

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
  const result = createInviteSchema.safeParse(body);
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

  // Only owner and admins can create invites
  const isOwner = company.ownerId === session.user.id;

  if (!isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only company owner can create invite links",
    });
  }

  // Create invite link
  const token = generateToken();

  const [invite] = await db
    .insert(inviteLinks)
    .values({
      id: crypto.randomUUID(),
      companyId,
      createdBy: session.user.id,
      token,
      role: result.data.role,
      maxUses: result.data.maxUses || null,
      expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null,
      isActive: true,
    })
    .returning();

  return {
    invite: {
      ...invite,
      inviteUrl: `${process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`,
    },
  };
});
