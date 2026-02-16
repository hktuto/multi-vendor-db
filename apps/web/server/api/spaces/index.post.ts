import { z } from "zod";
import { db } from "@nuxthub/db";
import { spaces, spaceMembers } from "@nuxthub/db/schema";
import { requireAuth } from "../utils/auth";
import { generateId } from "../utils/id";

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
  const user = await requireAuth(event);

  const body = await readBody(event);
  const input = createSpaceSchema.parse(body);

  // Verify user is member of the company
  const companyMember = await db.query.companyMembers.findFirst({
    where: (members, { eq, and }) =>
      and(eq(members.companyId, input.companyId), eq(members.userId, user.id)),
  });

  if (!companyMember) {
    throw createError({
      statusCode: 403,
      statusMessage: "Not a member of this company",
    });
  }

  const now = new Date();
  const spaceId = generateId();

  // Create space
  const [space] = await db
    .insert(spaces)
    .values({
      id: spaceId,
      companyId: input.companyId,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      settings: input.settings ?? {},
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Auto-add creator as admin
  await db.insert(spaceMembers).values({
    id: generateId(),
    spaceId: spaceId,
    userId: user.id,
    role: "admin",
    joinedAt: now,
    invitedBy: null,
  });

  return space;
});
