import { db } from '@nuxthub/db'
import { users, userAccounts } from '../../db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  // Validation
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required'
    })
  }

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase())
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  // Find password account
  const account = await db.query.userAccounts.findFirst({
    where: and(
      eq(userAccounts.userId, user.id),
      eq(userAccounts.provider, 'password')
    )
  })

  if (!account || !account.passwordHash) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  // Verify password
  const validPassword = await verifyPassword(account.passwordHash, password)

  if (!validPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  // Update last login
  const now = new Date()
  await db.update(users)
    .set({ lastLoginAt: now })
    .where(eq(users.id, user.id))

  // Set user session
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    loggedInAt: now.toISOString()
  })

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  }
})
