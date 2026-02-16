import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../../db";
import { spaceItems, spaceMembers } from "../../db/schema";
import { requireAuth } from "../utils/auth";
import { generateId } from "../utils/id";

const createItemSchema = z.object({
  spaceId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  type: z.enum(["folder", "table", "view", "dashboard"]),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
  orderIndex: z.number().int().optional(),
  config: z.record(z.any()).optional(),
});

/**
 * POST /api/space-items
 * Create a new space item
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);

  const body = await readBody(event);
  const input = createItemSchema.parse(body);

  // Check membership and permission
  const member = await db.query.spaceMembers.findFirst({
    where: (members, { eq, and }) =>
      and(
        eq(members.spaceId, input.spaceId),
        eq(members.userId, user.id),
      ),
  });

  if (!member) {
    throw createError({
      statusCode: 403,
      statusMessage: "Not a member of this space",
    });
  }

  // Only admin/editor can create items
  if (member.role === "viewer") {
    throw createError({
      statusCode: 403,
      statusMessage: "Viewers cannot create items",
    });
  }

  const now = new Date();

  // Check for duplicate name in same parent
  const existing = await db.query.spaceItems.findFirst({
    where: (items, { eq, and, isNull }) =>
      and(
        eq(items.spaceId, input.spaceId),
        input.parentId
          ? eq(items.parentId, input.parentId)
          : isNull(items.parentId),
        eq(items.name, input.name),
        isNull(items.deletedAt),
      ),
  });

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: "An item with this name already exists in this location",
    });
  }

  const [item] = await db
    .insert(spaceItems)
    .values({
      id: generateId(),
      spaceId: input.spaceId,
      parentId: input.parentId ?? null,
      type: input.type,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      orderIndex: input.orderIndex ?? 0,
      config: input.config ?? {},
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return item;
});
