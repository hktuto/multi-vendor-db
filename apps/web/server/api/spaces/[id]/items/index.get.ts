import { eq, and, isNull, asc } from 'drizzle-orm'
import { db, schema } from '@nuxthub/db'

export default defineEventHandler(async (event) => {
  const spaceId = getRouterParam(event, 'id')

  if (!spaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Space ID is required'
    })
  }

  // Check user has access to space
  const { user } = await getUserSession(event)

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }


  // Check space membership
  const membership = await db.query.spaceMembers.findFirst({
    where: (members, { eq, and }) => and(
      eq(members.spaceId, spaceId),
      eq(members.userId, user.id)
    )
  })

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied'
    })
  }

  // Get all items in space (not deleted)
  const items = await db.query.spaceItems.findMany({
    where: (items, { eq, and, isNull }) => and(
      eq(items.spaceId, spaceId),
      isNull(items.deletedAt)
    ),
    orderBy: [asc(schema.spaceItems.orderIndex), asc(schema.spaceItems.createdAt)]
  })

  return items
})
