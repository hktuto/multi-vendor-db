import { z } from "zod";
import { db, schema } from "@nuxthub/db";
import { eq, and } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

const createSpaceSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
  settings: z.record(z.any()).optional(),
});

/**
 * POST /api/spaces
 * Create a new space
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const body = await readBody(event);
  const input = createSpaceSchema.parse(body);

  // Verify user is member of the company
  const companyMember = await db.query.companyMembers.findFirst({
    where: (members, { eq, and }) =>
      and(
        eq(members.companyId, input.companyId),
        eq(members.userId, session.user.id),
      ),
  });

  if (!companyMember) {
    throw createError({
      statusCode: 403,
      statusMessage: "Not a member of this company",
    });
  }

  const now = new Date();
  const spaceId = uuidv7();

  // Create space
  const [newSpace] = await db
    .insert(schema.spaces)
    .values({
      id: spaceId,
      companyId: input.companyId,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      settings: input.settings ?? {},
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Auto-add creator as admin
  await db.insert(schema.spaceMembers).values({
    id: uuidv7(),
    spaceId: spaceId,
    userId: session.user.id,
    role: "admin",
    joinedAt: now,
    invitedBy: null,
  });

  return newSpace;
});
