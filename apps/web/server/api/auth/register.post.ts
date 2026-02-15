import { uuidv7 } from "uuidv7";
import { db } from "@nuxthub/db";
import { users, userAccounts } from "@nuxthub/db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const { email, password, name } = await readBody(event);

  // Validation
  if (!email || !password || !name) {
    throw createError({
      statusCode: 400,
      statusMessage: "Email, password, and name are required",
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please enter a valid email",
    });
  }

  // Password strength validation
  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password must be at least 8 characters",
    });
  }

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: "Email already registered",
    });
  }

  // Hash password using nuxt-auth-utils
  const passwordHash = await hashPassword(password);

  // Create user
  const userId = uuidv7();
  const now = new Date();

  await db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    name,
    preferences: {},
    createdAt: now,
    updatedAt: now,
    isActive: true,
  });

  // Create password account
  await db.insert(userAccounts).values({
    id: uuidv7(),
    userId,
    provider: "password",
    providerAccountId: email.toLowerCase(),
    passwordHash,
    lastPasswordUpdate: now,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  });

  // Set user session
  await setUserSession(event, {
    user: {
      id: userId,
      email: email.toLowerCase(),
      name,
    },
    loggedInAt: now.toISOString(),
  });

  return {
    success: true,
    user: {
      id: userId,
      email: email.toLowerCase(),
      name,
    },
  };
});
