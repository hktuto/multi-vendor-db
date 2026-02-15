import { uuidv7 } from "uuidv7";
import { db } from "@nuxthub/db";
import { users, userAccounts } from "@nuxthub/db/schema";
import { eq, and } from "drizzle-orm";

export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user: githubUser, tokens }) {
    const now = new Date();

    // Check if user already has a GitHub account linked
    let account = await db.query.userAccounts.findFirst({
      where: and(
        eq(userAccounts.provider, "github"),
        eq(userAccounts.providerAccountId, githubUser.id.toString()),
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
          expiresAt: tokens.expires_at
            ? new Date(tokens.expires_at * 1000)
            : null,
          updatedAt: now,
        })
        .where(eq(userAccounts.id, account.id));
    } else {
      // Check if user exists with same email
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, githubUser.email),
      });

      if (existingUser) {
        // Link GitHub to existing user
        userId = existingUser.id;
        await db.insert(userAccounts).values({
          id: uuidv7(),
          userId,
          provider: "github",
          providerAccountId: githubUser.id.toString(),
          accessToken: tokens.access_token,
          expiresAt: tokens.expires_at
            ? new Date(tokens.expires_at * 1000)
            : null,
          metadata: {
            login: githubUser.login,
            htmlUrl: githubUser.html_url,
          },
          createdAt: now,
          updatedAt: now,
        });
      } else {
        // Create new user
        userId = uuidv7();
        await db.insert(users).values({
          id: userId,
          email: githubUser.email,
          name: githubUser.name || githubUser.login,
          avatarUrl: githubUser.avatar_url,
          preferences: {},
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });

        await db.insert(userAccounts).values({
          id: uuidv7(),
          userId,
          provider: "github",
          providerAccountId: githubUser.id.toString(),
          accessToken: tokens.access_token,
          expiresAt: tokens.expires_at
            ? new Date(tokens.expires_at * 1000)
            : null,
          metadata: {
            login: githubUser.login,
            htmlUrl: githubUser.html_url,
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
    console.error("GitHub OAuth error:", error);
    return sendRedirect(event, "/login?error=github-auth-failed");
  },
});
