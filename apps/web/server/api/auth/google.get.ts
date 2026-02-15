import { uuidv7 } from "uuidv7";
import { db } from "@nuxthub/db";
import { users, userAccounts } from "@nuxthub/db/schema";
import { eq, and } from "drizzle-orm";

export default defineOAuthGoogleEventHandler({
  config: {
    scope: ["openid", "email", "profile"],
  },
  async onSuccess(event, { user: googleUser, tokens }) {
    const now = new Date();

    // Check if user already has a Google account linked
    let account = await db.query.userAccounts.findFirst({
      where: and(
        eq(userAccounts.provider, "google"),
        eq(userAccounts.providerAccountId, googleUser.sub),
      ),
    });

    let userId: string;

    if (account) {
      // Existing user - update tokens and get userId
      userId = account.userId;
      await db
        .update(userAccounts)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_at
            ? new Date(tokens.expires_at * 1000)
            : null,
          updatedAt: now,
        })
        .where(eq(userAccounts.id, account.id));
    } else {
      // Check if user exists with same email
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, googleUser.email),
      });

      if (existingUser) {
        // Link Google to existing user
        userId = existingUser.id;
        await db.insert(userAccounts).values({
          id: uuidv7(),
          userId,
          provider: "google",
          providerAccountId: googleUser.sub,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_at
            ? new Date(tokens.expires_at * 1000)
            : null,
          metadata: {
            picture: googleUser.picture,
            locale: googleUser.locale,
          },
          createdAt: now,
          updatedAt: now,
        });
      } else {
        // Create new user
        userId = uuidv7();
        await db.insert(users).values({
          id: userId,
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          preferences: {},
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });

        await db.insert(userAccounts).values({
          id: uuidv7(),
          userId,
          provider: "google",
          providerAccountId: googleUser.sub,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_at
            ? new Date(tokens.expires_at * 1000)
            : null,
          metadata: {
            picture: googleUser.picture,
            locale: googleUser.locale,
          },
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: now })
      .where(eq(users.id, userId));

    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // Set session
    await setUserSession(event, {
      user: {
        id: userId,
        email: user!.email,
        name: user!.name,
      },
      loggedInAt: now.toISOString(),
    });

    return sendRedirect(event, "/dashboard");
  },
  onError(event, error) {
    console.error("Google OAuth error:", error);
    return sendRedirect(event, "/login?error=google-auth-failed");
  },
});
