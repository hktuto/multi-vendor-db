import { spaceItems } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { db } from '@nuxthub/db'
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')

  if (!itemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Item ID is required'
    })
  }

  const { user } = await requireUserSession(event)


  // Get the item
  const item = await db.query.spaceItems.findFirst({
    where: eq(spaceItems.id, itemId)
  })

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Item not found'
    })
  }

  // Check space membership
  const membership = await db.query.spaceMembers.findFirst({
    where: (members, { eq, and }) => and(
      eq(members.spaceId, item.spaceId),
      eq(members.userId, user.id)
    )
  })

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied'
    })
  }

  return item
})
