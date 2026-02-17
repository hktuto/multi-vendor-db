import { spaceItems } from '../../../../db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { db } from '@nuxthub/db'
export default defineEventHandler(async (event) => {
  const spaceId = getRouterParam(event, 'id')

  if (!spaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Space ID is required'
    })
  }

  const { user } = await getUserSession(event)

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  // Check space membership and permissions
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

  // Check if user can create items (admin or editor)
  if (!['admin', 'editor'].includes(membership.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions'
    })
  }

  const body = await readBody(event)
  const { type, name, description, parentId, icon, color, config } = body

  if (!type || !name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Type and name are required'
    })
  }

  // Validate parent folder if provided
  if (parentId) {
    const parentFolder = await db.query.spaceItems.findFirst({
      where: (items, { eq, and }) => and(
        eq(items.id, parentId),
        eq(items.spaceId, spaceId),
        eq(items.type, 'folder'),
        isNull(items.deletedAt)
      )
    })

    if (!parentFolder) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Parent folder not found'
      })
    }
  }

  // Get max order index for the target parent
  const siblings = await db.query.spaceItems.findMany({
    where: (items, { eq, and, isNull }) => and(
      eq(items.spaceId, spaceId),
      parentId ? eq(items.parentId, parentId) : isNull(items.parentId),
      isNull(items.deletedAt)
    ),
    orderBy: [desc(spaceItems.orderIndex)],
    limit: 1
  })

  const orderIndex = (siblings[0]?.orderIndex || 0) + 1

  // Create the item
  const [newItem] = await db.insert(spaceItems).values({
    id: uuidv7(),
    spaceId,
    parentId: parentId || null,
    type,
    name,
    description: description || null,
    icon: icon || null,
    color: color || null,
    orderIndex,
    config: config || {},
    createdBy: user.id
  }).returning()

  return newItem
})
