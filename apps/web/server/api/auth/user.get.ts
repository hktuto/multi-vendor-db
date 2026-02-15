import { db } from '@nuxthub/db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  
  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      preferences: true,
      createdAt: true,
      lastLoginAt: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  return {
    user
  }
})
