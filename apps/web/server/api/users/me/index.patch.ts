import { db } from "@nuxthub/db";
import { users } from "@nuxthub/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      language: z.string().optional(),
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

  const body = await readBody(event);

  // Validate input
  const result = updateUserSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Invalid input: " +
        result.error.issues.map((e: any) => e.message).join(", "),
    });
  }

  // Get current user
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!currentUser) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  // Build update object
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (result.data.name !== undefined) {
    updateData.name = result.data.name;
  }

  if (result.data.avatarUrl !== undefined) {
    updateData.avatarUrl = result.data.avatarUrl;
  }

  if (result.data.preferences !== undefined) {
    updateData.preferences = {
      ...currentUser.preferences,
      ...result.data.preferences,
    };
  }

  // Update user
  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, session.user.id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      preferences: users.preferences,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
      isActive: users.isActive,
    });

  return {
    user: updatedUser,
  };
});
